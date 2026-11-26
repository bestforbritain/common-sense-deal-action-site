/**
 * Writes for self-reported email counts and marketing opt-ins.
 *
 * Without Supabase (local development) nothing is stored: the call succeeds and a
 * note is logged without any personal data, so the flow can still be tried end to end.
 */
import { getSupabase } from "@/lib/supabase";

export async function recordEmailSent(entry: { onsCode: string; sector: string }): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    console.info(`[local] Email sent recorded (not stored): ${entry.sector}, ${entry.onsCode}`);
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
    console.info(`[local] Marketing opt-in received (not stored) from ${entry.source}`);
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
