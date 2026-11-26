/**
 * Storage for posted letters, settings and the audit log.
 *
 * Production: Supabase tables (migration 0003) and the private "letters" storage bucket.
 * Local development and tests: an in-memory store (cleared when the server restarts).
 */
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { AuditEntry, Letter, LetterFilter, LetterStatus, NewLetter, Settings } from "./types";

export class DuplicateLetterError extends Error {}

export interface PostedStore {
  insertLetter(letter: NewLetter, pdf: Uint8Array): Promise<Letter>;
  getLetter(id: string): Promise<Letter | null>;
  getLetterByTokenHash(hash: string): Promise<Letter | null>;
  getPdf(letter: Letter): Promise<Uint8Array>;
  listLetters(filter: LetterFilter, limit?: number): Promise<Letter[]>;
  /** Every letter, for stats and exports. */
  allLetters(): Promise<Letter[]>;
  /** Atomic: updates only if the letter is currently in one of `from`. Returns null otherwise. */
  transition(id: string, from: LetterStatus[], patch: Partial<Letter>): Promise<Letter | null>;
  getSettings(): Promise<Settings>;
  saveSettings(patch: Partial<Settings>, actor: string): Promise<Settings>;
  /** Pence spent on real (not test) letters, from Stannp's reported costs. */
  spendPence(): Promise<number>;
  /** Letters accepted by Stannp since midnight UTC. */
  sentTodayCount(): Promise<number>;
  getLetterByStannpId(stannpId: number): Promise<Letter | null>;
  /** Records a webhook delivery; false if it was already processed. */
  markWebhookEvent(webhookId: string): Promise<boolean>;
  /** Letters in a final state, created before `before`, not yet anonymised. */
  listForRetention(before: Date, limit?: number): Promise<Letter[]>;
  /** Removes a letter's personal data and PDF, keeping sector, constituency, recipient and status. */
  anonymise(letter: Letter): Promise<void>;
  addAudit(entry: Omit<AuditEntry, "id" | "createdAt">): Promise<void>;
  listAudit(limit?: number): Promise<AuditEntry[]>;
}

const DEFAULT_SETTINGS: Settings = { autoSend: false, livePosting: false, dailyCap: null, totalBudgetPence: null, updatedAt: null, updatedBy: null };

export const FINAL_STATUSES: LetterStatus[] = ["sent", "dispatched", "returned", "failed", "rejected", "expired"];

export const ANONYMISED: Partial<Letter> = {
  senderName: "",
  senderRole: "",
  businessName: "",
  businessAddress: "",
  email: null as unknown as string,
  letterText: null as unknown as string,
};

// The token hash column is unique, so each anonymised letter gets its own placeholder.
const anonymisedFields = (letter: Letter): Partial<Letter> => ({
  ...ANONYMISED,
  confirmTokenHash: `anonymised:${letter.id}`,
  anonymisedAt: new Date().toISOString(),
});

export function validateSettings(s: Settings): string | null {
  if (s.autoSend && s.totalBudgetPence === null) return "Set a total budget cap before switching on auto-send.";
  if (s.dailyCap !== null && (!Number.isInteger(s.dailyCap) || s.dailyCap < 0)) return "The daily cap must be a whole number of letters.";
  if (s.totalBudgetPence !== null && (!Number.isInteger(s.totalBudgetPence) || s.totalBudgetPence < 0)) return "The budget cap must be a positive amount.";
  return null;
}

const startOfTodayUtc = () => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
};

// ---------------------------------------------------------------- in memory

type Memory = { letters: Map<string, Letter>; pdfs: Map<string, Uint8Array>; settings: Settings; audit: AuditEntry[]; webhooks?: Set<string> };
const globalMemory = globalThis as unknown as { __csdPostedStore?: Memory };

export function createMemoryStore(memory: Memory = { letters: new Map(), pdfs: new Map(), settings: { ...DEFAULT_SETTINGS }, audit: [] }): PostedStore {
  return {
    async insertLetter(input, pdf) {
      for (const l of memory.letters.values()) {
        if (l.email.toLowerCase() === input.email.toLowerCase() && l.recipientKey === input.recipientKey && !["rejected", "expired"].includes(l.status)) {
          throw new DuplicateLetterError();
        }
      }
      const now = new Date().toISOString();
      const id = randomUUID();
      const letter: Letter = {
        ...input,
        id,
        status: "awaiting_confirmation",
        pdfPath: `${id}.pdf`,
        confirmedAt: null,
        approvedAt: null,
        approvedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        sentAt: null,
        stannpId: null,
        stannpTest: null,
        stannpCostPence: null,
        stannpPdfUrl: null,
        stannpStatus: null,
        failureReason: null,
        anonymisedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      memory.letters.set(id, letter);
      memory.pdfs.set(letter.pdfPath, pdf);
      return { ...letter };
    },
    async getLetter(id) {
      const l = memory.letters.get(id);
      return l ? { ...l } : null;
    },
    async getLetterByTokenHash(hash) {
      for (const l of memory.letters.values()) if (l.confirmTokenHash === hash) return { ...l };
      return null;
    },
    async getPdf(letter) {
      const pdf = memory.pdfs.get(letter.pdfPath);
      if (!pdf) throw new Error("PDF not found");
      return pdf;
    },
    async listLetters(filter, limit = 200) {
      return [...memory.letters.values()]
        .filter((l) => (!filter.status || l.status === filter.status) && (!filter.recipientType || l.recipientType === filter.recipientType) && (!filter.sector || l.sector === filter.sector))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map((l) => ({ ...l }));
    },
    async allLetters() {
      return [...memory.letters.values()].map((l) => ({ ...l }));
    },
    async transition(id, from, patch) {
      const l = memory.letters.get(id);
      if (!l || !from.includes(l.status)) return null;
      const updated = { ...l, ...patch, updatedAt: new Date().toISOString() };
      memory.letters.set(id, updated);
      return { ...updated };
    },
    async getSettings() {
      return { ...memory.settings };
    },
    async saveSettings(patch, actor) {
      const next = { ...memory.settings, ...patch, updatedAt: new Date().toISOString(), updatedBy: actor };
      const problem = validateSettings(next);
      if (problem) throw new Error(problem);
      memory.settings = next;
      return { ...next };
    },
    async spendPence() {
      return [...memory.letters.values()].reduce((sum, l) => sum + (l.stannpTest === false ? (l.stannpCostPence ?? 0) : 0), 0);
    },
    async sentTodayCount() {
      const since = startOfTodayUtc().toISOString();
      return [...memory.letters.values()].filter((l) => l.sentAt && l.sentAt >= since).length;
    },
    async getLetterByStannpId(stannpId) {
      for (const l of memory.letters.values()) if (l.stannpId === stannpId && stannpId !== 0) return { ...l };
      return null;
    },
    async markWebhookEvent(webhookId) {
      memory.webhooks ??= new Set();
      if (memory.webhooks.has(webhookId)) return false;
      memory.webhooks.add(webhookId);
      return true;
    },
    async listForRetention(before, limit = 500) {
      return [...memory.letters.values()]
        .filter((l) => FINAL_STATUSES.includes(l.status) && !l.anonymisedAt && l.createdAt < before.toISOString())
        .slice(0, limit)
        .map((l) => ({ ...l }));
    },
    async anonymise(letter) {
      const l = memory.letters.get(letter.id);
      if (!l) return;
      memory.pdfs.delete(l.pdfPath);
      memory.letters.set(l.id, { ...l, ...anonymisedFields(l) });
    },
    async addAudit(entry) {
      memory.audit.unshift({ ...entry, id: memory.audit.length + 1, createdAt: new Date().toISOString() });
    },
    async listAudit(limit = 100) {
      return memory.audit.slice(0, limit);
    },
  };
}

// ---------------------------------------------------------------- Supabase

const snake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const toRow = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [snake(k), v]));
const fromRow = <T,>(row: Record<string, unknown>) => Object.fromEntries(Object.entries(row).map(([k, v]) => [camel(k), v])) as T;

const letterToRow = (o: Partial<Letter>) => toRow(o);
const settingsFromRow = (row: Record<string, unknown> | null): Settings => {
  if (!row) throw new Error("Settings row is missing; run migration 0003");
  const s = fromRow<Settings & { id?: number }>(row);
  delete s.id;
  return s;
};

function createSupabaseStore(db: SupabaseClient): PostedStore {
  const check = <T,>(result: { data: T; error: { message: string; code?: string } | null }, what: string): T => {
    if (result.error) throw new Error(`${what}: ${result.error.message}`);
    return result.data;
  };

  return {
    async insertLetter(input, pdf) {
      const id = randomUUID();
      const pdfPath = `${id}.pdf`;
      const upload = await db.storage.from("letters").upload(pdfPath, pdf, { contentType: "application/pdf", upsert: false });
      if (upload.error) throw new Error(`Storing the PDF failed: ${upload.error.message}`);
      const result = await db.from("letters").insert(letterToRow({ ...input, id, pdfPath })).select().single();
      if (result.error) {
        await db.storage.from("letters").remove([pdfPath]);
        if (result.error.code === "23505") throw new DuplicateLetterError();
        throw new Error(`Saving the letter failed: ${result.error.message}`);
      }
      return fromRow<Letter>(result.data);
    },
    async getLetter(id) {
      const data = check(await db.from("letters").select().eq("id", id).maybeSingle(), "Reading a letter");
      return data ? fromRow<Letter>(data) : null;
    },
    async getLetterByTokenHash(hash) {
      const data = check(await db.from("letters").select().eq("confirm_token_hash", hash).maybeSingle(), "Reading a letter");
      return data ? fromRow<Letter>(data) : null;
    },
    async getPdf(letter) {
      const { data, error } = await db.storage.from("letters").download(letter.pdfPath);
      if (error || !data) throw new Error(`Reading the PDF failed: ${error?.message}`);
      return new Uint8Array(await data.arrayBuffer());
    },
    async listLetters(filter, limit = 200) {
      let q = db.from("letters").select().order("created_at", { ascending: false }).limit(limit);
      if (filter.status) q = q.eq("status", filter.status);
      if (filter.recipientType) q = q.eq("recipient_type", filter.recipientType);
      if (filter.sector) q = q.eq("sector", filter.sector);
      return (check(await q, "Listing letters") ?? []).map((r) => fromRow<Letter>(r));
    },
    async allLetters() {
      const rows: Letter[] = [];
      for (let from = 0; ; from += 1000) {
        const data = check(await db.from("letters").select().order("created_at").range(from, from + 999), "Reading letters");
        rows.push(...(data ?? []).map((r) => fromRow<Letter>(r)));
        if (!data || data.length < 1000) return rows;
      }
    },
    async transition(id, from, patch) {
      const data = check(
        await db.from("letters").update(letterToRow({ ...patch, updatedAt: new Date().toISOString() })).eq("id", id).in("status", from).select().maybeSingle(),
        "Updating a letter",
      );
      return data ? fromRow<Letter>(data) : null;
    },
    async getSettings() {
      return settingsFromRow(check(await db.from("settings").select().eq("id", 1).single(), "Reading settings"));
    },
    async saveSettings(patch, actor) {
      const current = await this.getSettings();
      const next = { ...current, ...patch, updatedAt: new Date().toISOString(), updatedBy: actor };
      const problem = validateSettings(next);
      if (problem) throw new Error(problem);
      return settingsFromRow(check(await db.from("settings").update(toRow(next)).eq("id", 1).select().single(), "Saving settings"));
    },
    async spendPence() {
      const data = check(await db.from("letters").select("stannp_cost_pence").eq("stannp_test", false), "Reading spend");
      return (data ?? []).reduce((sum, r) => sum + (r.stannp_cost_pence ?? 0), 0);
    },
    async sentTodayCount() {
      const { count, error } = await db.from("letters").select("id", { count: "exact", head: true }).gte("sent_at", startOfTodayUtc().toISOString());
      if (error) throw new Error(`Counting letters: ${error.message}`);
      return count ?? 0;
    },
    async getLetterByStannpId(stannpId) {
      if (!stannpId) return null;
      const data = check(await db.from("letters").select().eq("stannp_id", stannpId).maybeSingle(), "Reading a letter");
      return data ? fromRow<Letter>(data) : null;
    },
    async markWebhookEvent(webhookId) {
      const { error } = await db.from("webhook_events").insert({ webhook_id: webhookId });
      if (!error) return true;
      if (error.code === "23505") return false;
      throw new Error(`Recording a webhook: ${error.message}`);
    },
    async listForRetention(before, limit = 500) {
      const data = check(
        await db.from("letters").select().in("status", FINAL_STATUSES).is("anonymised_at", null).lt("created_at", before.toISOString()).limit(limit),
        "Listing letters for retention",
      );
      return (data ?? []).map((r) => fromRow<Letter>(r));
    },
    async anonymise(letter) {
      const removed = await db.storage.from("letters").remove([letter.pdfPath]);
      if (removed.error) throw new Error(`Deleting a PDF: ${removed.error.message}`);
      check(
        await db.from("letters").update(letterToRow(anonymisedFields(letter))).eq("id", letter.id),
        "Anonymising a letter",
      );
    },
    async addAudit(entry) {
      check(await db.from("audit_log").insert(toRow(entry)), "Writing the audit log");
    },
    async listAudit(limit = 100) {
      const data = check(await db.from("audit_log").select().order("created_at", { ascending: false }).limit(limit), "Reading the audit log");
      return (data ?? []).map((r) => fromRow<AuditEntry>(r));
    },
  };
}

let store: PostedStore | undefined;

export function getPostedStore(): PostedStore {
  if (store) return store;
  const supabase = getSupabase();
  if (supabase) {
    store = createSupabaseStore(supabase);
  } else {
    globalMemory.__csdPostedStore ??= { letters: new Map(), pdfs: new Map(), settings: { ...DEFAULT_SETTINGS }, audit: [] };
    store = createMemoryStore(globalMemory.__csdPostedStore);
  }
  return store;
}
