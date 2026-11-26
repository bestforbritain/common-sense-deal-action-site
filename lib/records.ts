/**
 * Self-reported email counts and marketing opt-ins.
 *
 * Without Supabase (local development) these are kept in memory so the admin stats and
 * exports can be tried; they're lost when the server restarts.
 */
import { getSupabase } from "@/lib/supabase";

export type EmailSend = { createdAt: string; onsCode: string; sector: string };
export type OptIn = { email: string; optedInAt: string; wordingVersion: string; wording: string; source: string };

const memory = globalThis as unknown as { __csdRecords?: { emails: EmailSend[]; optins: OptIn[] } };
const local = () => (memory.__csdRecords ??= { emails: [], optins: [] });

export async function recordEmailSent(entry: { onsCode: string; sector: string }): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    local().emails.push({ ...entry, createdAt: new Date().toISOString() });
    return;
  }
  const { error } = await supabase.from("email_sends").insert({ ons_code: entry.onsCode, sector: entry.sector });
  if (error) throw new Error(`Recording an email send failed: ${error.message}`);
}

export async function recordMarketingOptIn(entry: {
  email: string;
  wordingVersion: string;
  wording: string;
  source: "email-mp" | "posted-letter";
}): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    local().optins.push({ ...entry, optedInAt: new Date().toISOString() });
    return;
  }
  const { error } = await supabase.from("marketing_optins").insert({
    email: entry.email,
    wording_version: entry.wordingVersion,
    wording: entry.wording,
    source: entry.source,
  });
  if (error) throw new Error(`Recording an opt-in failed: ${error.message}`);
}

/** Reads a whole table in pages of 1,000 rows (Supabase's default limit). */
async function readAll<T>(table: string, columns: string, order: string): Promise<T[]> {
  const supabase = getSupabase()!;
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(columns).order(order).range(from, from + 999);
    if (error) throw new Error(`Reading ${table}: ${error.message}`);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) return rows;
  }
}

export async function listEmailSends(): Promise<EmailSend[]> {
  if (!getSupabase()) return [...local().emails];
  const rows = await readAll<{ created_at: string; ons_code: string; sector: string }>("email_sends", "created_at, ons_code, sector", "created_at");
  return rows.map((r) => ({ createdAt: r.created_at, onsCode: r.ons_code, sector: r.sector }));
}

export async function listOptIns(): Promise<OptIn[]> {
  if (!getSupabase()) return [...local().optins];
  const rows = await readAll<{ email: string; opted_in_at: string; wording_version: string; wording: string; source: string }>(
    "marketing_optins",
    "email, opted_in_at, wording_version, wording, source",
    "opted_in_at",
  );
  return rows.map((r) => ({ email: r.email, optedInAt: r.opted_in_at, wordingVersion: r.wording_version, wording: r.wording, source: r.source }));
}
