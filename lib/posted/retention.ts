import { LETTER_RETENTION_DAYS } from "@/content/privacy";
import type { PostedStore } from "./store";

export type RetentionResult = { skipped: true } | { skipped: false; anonymised: number; before: string };

/** Removes personal data from letters older than the retention period (content/privacy.ts). */
export async function runRetention(
  store: PostedStore,
  options: { days?: number | null; now?: Date } = {},
): Promise<RetentionResult> {
  const days = options.days === undefined ? LETTER_RETENTION_DAYS : options.days;
  if (days === null) return { skipped: true };
  const before = new Date((options.now ?? new Date()).getTime() - days * 86_400_000);
  let anonymised = 0;
  for (const letter of await store.listForRetention(before)) {
    await store.anonymise(letter);
    anonymised++;
  }
  if (anonymised) await store.addAudit({ actor: "retention-job", action: "anonymise", target: null, details: { count: anonymised, before: before.toISOString() } });
  return { skipped: false, anonymised, before: before.toISOString() };
}
