/**
 * Posted letters: preview → submit → confirm → approve → post.
 *
 * awaiting_confirmation → awaiting_approval → queued → sending → sent → dispatched
 *                                          ↘ rejected            ↘ failed / returned
 */
import { createHash, randomBytes } from "node:crypto";
import { fill } from "@/content/copy";
import { emailCopy } from "@/content/postedLetter";
import { minister } from "@/content/minister";
import { findSector } from "@/content/sectors";
import { getConstituencyBySlug } from "@/lib/constituencies/store";
import type { Constituency, Mp } from "@/lib/constituencies/types";
import { sendEmail } from "@/lib/mailer";
import { renderLetterPdf } from "@/lib/pdf/letterPdf";
import { postLetter, type StannpRecipient } from "@/lib/stannp";
import { isEmailFormat } from "@/lib/validation";
import { DuplicateLetterError, getPostedStore, type PostedStore } from "./store";
import type { Letter, RecipientType } from "./types";

export const CONFIRM_HOURS = 48;

export type PostedInput = {
  constituencySlug: string;
  sectorSlug: string;
  recipientType: RecipientType;
  senderName: string;
  role: string;
  businessName: string;
  businessAddress: string;
  email: string;
  letterText: string;
};

export type FieldError = "senderName" | "role" | "businessName" | "businessAddress" | "email" | "letterText";

type Resolved = {
  constituency: Constituency;
  recipientKey: string;
  recipientName: string;
  recipientAddress: StannpRecipient;
};

// ----------------------------------------------------------------- recipients

export function mpRecipient(mp: Mp): StannpRecipient | null {
  const lines = mp.postalAddress;
  if (!lines || lines.length < 2) return null;
  const postcode = lines[lines.length - 1];
  const rest = lines.slice(0, -1);
  // "House of Commons, London, SW1A 0AA" → address1 "House of Commons", city "London".
  // Two MPs list only "House of Commons, SW1A 0AA"; SW1A is in London.
  const city = rest.length > 1 ? rest[rest.length - 1] : postcode.startsWith("SW1A") ? "London" : "";
  const addressLines = rest.length > 1 ? rest.slice(0, -1) : rest;
  return {
    firstname: mp.displayName,
    lastname: "MP",
    address1: addressLines[0],
    address2: addressLines.slice(1).join(", ") || undefined,
    city,
    postcode,
    country: "GB",
  };
}

export function ministerRecipient(): StannpRecipient {
  return {
    firstname: minister.name,
    company: minister.organisation,
    address1: minister.address.line1,
    city: minister.address.city,
    postcode: minister.address.postcode,
    country: "GB",
  };
}

async function resolve(input: Pick<PostedInput, "constituencySlug" | "sectorSlug" | "recipientType">): Promise<Resolved | null> {
  if (!findSector(input.sectorSlug)) return null;
  const constituency = await getConstituencyBySlug(input.constituencySlug);
  if (!constituency || constituency.nation === "northern-ireland") return null;

  if (input.recipientType === "minister") {
    return { constituency, recipientKey: "minister", recipientName: minister.name, recipientAddress: ministerRecipient() };
  }
  if (input.recipientType === "mp" && constituency.mp) {
    const address = mpRecipient(constituency.mp);
    if (!address) return null;
    return { constituency, recipientKey: `mp:${constituency.mp.id}`, recipientName: `${constituency.mp.displayName} MP`, recipientAddress: address };
  }
  return null;
}

// ----------------------------------------------------------------- preview & submit

export type PreviewResult =
  | { ok: true; pdf: Uint8Array; sha256: string }
  | { ok: false; error: "bad-request" | "too-long" | "empty" };

export async function previewLetter(input: PostedInput): Promise<PreviewResult> {
  if (!(await resolve(input))) return { ok: false, error: "bad-request" };
  const rendered = await renderLetterPdf(input.letterText);
  if (!rendered.ok) return { ok: false, error: rendered.reason };
  return { ok: true, pdf: rendered.pdf, sha256: rendered.sha256 };
}

export function validateFields(input: PostedInput): FieldError[] {
  const errors: FieldError[] = [];
  for (const key of ["senderName", "role", "businessName", "businessAddress", "letterText"] as const) {
    if (!input[key]?.trim()) errors.push(key);
  }
  if (!isEmailFormat(input.email ?? "")) errors.push("email");
  return errors;
}

export type SubmitResult =
  | { ok: true; letterId: string }
  | { ok: false; error: "bad-request" | "fields" | "too-long" | "preview-changed" | "duplicate"; fields?: FieldError[] };

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function submitLetter(
  input: PostedInput & { previewSha256: string },
  options: { origin: string; store?: PostedStore; now?: Date },
): Promise<SubmitResult> {
  const store = options.store ?? getPostedStore();
  const resolved = await resolve(input);
  if (!resolved) return { ok: false, error: "bad-request" };
  const fields = validateFields(input);
  if (fields.length) return { ok: false, error: "fields", fields };

  const rendered = await renderLetterPdf(input.letterText);
  if (!rendered.ok) return { ok: false, error: rendered.reason === "too-long" ? "too-long" : "fields", fields: ["letterText"] };
  // The PDF we post must be the PDF they previewed.
  if (rendered.sha256 !== input.previewSha256) return { ok: false, error: "preview-changed" };

  const token = randomBytes(32).toString("base64url");
  const now = options.now ?? new Date();
  let letter: Letter;
  try {
    letter = await store.insertLetter(
      {
        recipientType: input.recipientType,
        recipientKey: resolved.recipientKey,
        recipientName: resolved.recipientName,
        recipientAddress: resolved.recipientAddress,
        onsCode: resolved.constituency.onsCode,
        constituencyName: resolved.constituency.name,
        sector: input.sectorSlug,
        senderName: input.senderName.trim(),
        senderRole: input.role.trim(),
        businessName: input.businessName.trim(),
        businessAddress: input.businessAddress.trim(),
        email: input.email.trim(),
        letterText: input.letterText,
        pdfSha256: rendered.sha256,
        flags: [],
        confirmTokenHash: hashToken(token),
        confirmExpiresAt: new Date(now.getTime() + CONFIRM_HOURS * 3600_000).toISOString(),
      },
      rendered.pdf,
    );
  } catch (error) {
    if (error instanceof DuplicateLetterError) return { ok: false, error: "duplicate" };
    throw error;
  }

  const values = { name: letter.senderName, recipient: letter.recipientName, link: `${options.origin}/letters/confirm/${token}` };
  await sendEmail({
    to: letter.email,
    subject: fill(emailCopy.confirm.subject, values),
    text: emailCopy.confirm.body.map((line) => fill(line, values)).join("\n\n"),
  });
  return { ok: true, letterId: letter.id };
}

// ----------------------------------------------------------------- confirm

export type ConfirmResult = { kind: "confirmed"; autoSend: boolean; capDelay: boolean } | { kind: "already" } | { kind: "expired" } | { kind: "invalid" };

/** Read-only check used to show the confirmation page before the button is pressed. */
export async function inspectToken(
  token: string,
  options: { store?: PostedStore; now?: Date } = {},
): Promise<{ kind: "pending"; recipientName: string } | { kind: "already" } | { kind: "expired" } | { kind: "invalid" }> {
  const store = options.store ?? getPostedStore();
  const letter = token ? await store.getLetterByTokenHash(hashToken(token)) : null;
  if (!letter) return { kind: "invalid" };
  if (letter.status === "expired") return { kind: "expired" };
  if (letter.status !== "awaiting_confirmation") return { kind: "already" };
  if (new Date(letter.confirmExpiresAt) < (options.now ?? new Date())) return { kind: "expired" };
  return { kind: "pending", recipientName: letter.recipientName };
}

/**
 * Confirms a letter. Called from a button on the confirmation page, not on opening the
 * link, because email security scanners open links automatically.
 */
export async function confirmLetter(token: string, options: { store?: PostedStore; now?: Date } = {}): Promise<ConfirmResult> {
  const store = options.store ?? getPostedStore();
  const letter = token ? await store.getLetterByTokenHash(hashToken(token)) : null;
  if (!letter) return { kind: "invalid" };
  if (letter.status !== "awaiting_confirmation") return letter.status === "expired" ? { kind: "expired" } : { kind: "already" };

  const now = options.now ?? new Date();
  if (new Date(letter.confirmExpiresAt) < now) {
    await store.transition(letter.id, ["awaiting_confirmation"], { status: "expired" });
    return { kind: "expired" };
  }

  const settings = await store.getSettings();
  const next = settings.autoSend ? "queued" : "awaiting_approval";
  const updated = await store.transition(letter.id, ["awaiting_confirmation"], { status: next, confirmedAt: now.toISOString() });
  if (!updated) return { kind: "already" };

  const values = { name: letter.senderName, recipient: letter.recipientName };
  await sendEmail({
    to: letter.email,
    subject: fill(emailCopy.received.subject, values),
    text: emailCopy.received.body.map((line) => fill(line, values)).join("\n\n"),
  });

  let capDelay = false;
  if (settings.autoSend) capDelay = (await processQueue({ store })).stoppedByCap;
  return { kind: "confirmed", autoSend: settings.autoSend, capDelay };
}

// ----------------------------------------------------------------- staff actions

export async function approveLetters(ids: string[], actor: string, store: PostedStore = getPostedStore()): Promise<number> {
  let approved = 0;
  for (const id of ids) {
    const updated = await store.transition(id, ["awaiting_approval"], { status: "queued", approvedAt: new Date().toISOString(), approvedBy: actor });
    if (updated) {
      approved++;
      await store.addAudit({ actor, action: "approve", target: id, details: {} });
    }
  }
  if (approved) await processQueue({ store });
  return approved;
}

export async function rejectLetter(id: string, reason: string, actor: string, store: PostedStore = getPostedStore()): Promise<boolean> {
  const updated = await store.transition(id, ["awaiting_approval", "queued"], {
    status: "rejected",
    rejectedAt: new Date().toISOString(),
    rejectedBy: actor,
    rejectionReason: reason.trim() || null,
  });
  if (updated) await store.addAudit({ actor, action: "reject", target: id, details: { reason } });
  return Boolean(updated);
}

// ----------------------------------------------------------------- the queue

/** Marks unconfirmed letters older than 48 hours as expired. */
export async function expireUnconfirmed(store: PostedStore = getPostedStore(), now = new Date()): Promise<number> {
  let expired = 0;
  for (const letter of await store.listLetters({ status: "awaiting_confirmation" }, 1000)) {
    if (new Date(letter.confirmExpiresAt) < now && (await store.transition(letter.id, ["awaiting_confirmation"], { status: "expired" }))) expired++;
  }
  return expired;
}

/**
 * Posts queued letters, oldest first, through postLetter() (test mode unless every
 * live-posting condition holds). Stops at the daily or total budget cap; letters
 * over the cap stay queued for the next run.
 */
export async function processQueue(
  options: { store?: PostedStore; post?: typeof postLetter } = {},
): Promise<{ sent: number; failed: number; stoppedByCap: boolean }> {
  const store = options.store ?? getPostedStore();
  const post = options.post ?? postLetter;
  const result = { sent: 0, failed: 0, stoppedByCap: false };

  if (!options.post && !process.env.STANNP_API_KEY) {
    console.info("Stannp isn't configured (no STANNP_API_KEY): queued letters stay queued.");
    return result;
  }

  const settings = await store.getSettings();
  const queued = (await store.listLetters({ status: "queued" }, 50)).reverse();
  for (const letter of queued) {
    if (settings.dailyCap !== null && (await store.sentTodayCount()) >= settings.dailyCap) return { ...result, stoppedByCap: true };
    if (settings.totalBudgetPence !== null && (await store.spendPence()) >= settings.totalBudgetPence) return { ...result, stoppedByCap: true };

    // Claim the letter, so two runs can't post it twice.
    const claimed = await store.transition(letter.id, ["queued"], { status: "sending" });
    if (!claimed) continue;

    try {
      const pdf = await store.getPdf(claimed);
      const posted = await post({ letterId: claimed.id, pdf, recipient: claimed.recipientAddress, livePostingSetting: settings.livePosting });
      await store.transition(claimed.id, ["sending"], {
        status: "sent",
        sentAt: new Date().toISOString(),
        stannpId: posted.stannpId,
        stannpTest: posted.test,
        stannpCostPence: posted.costPence,
        stannpPdfUrl: posted.pdfUrl,
        stannpStatus: posted.status,
      });
      result.sent++;
    } catch (error) {
      await store.transition(claimed.id, ["sending"], { status: "failed", failureReason: error instanceof Error ? error.message : "Posting failed" });
      result.failed++;
    }
  }
  return result;
}
