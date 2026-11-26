/**
 * Stannp webhooks (https://www.stannp.com/uk/direct-mail-api/webhooks).
 *
 * - Authenticity: X-Stannp-Signature is an HMAC-SHA256 of the raw body, keyed with the
 *   secret set when the webhook was created. Stannp doesn't say whether it's hex or
 *   base64, so both are accepted, compared in constant time.
 * - Repeats: Stannp retries up to 3 times and signatures carry no timestamp, so each
 *   webhook_id is processed once.
 * - Event: mailpiece_status, with statuses printing, dispatched, cancelled,
 *   local_delivery, delivered, returned.
 *
 * [TODO: check the field names below against a real delivery once the webhook is set up.]
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { fill } from "@/content/copy";
import { emailCopy } from "@/content/postedLetter";
import { sendEmail } from "@/lib/mailer";
import type { PostedStore } from "./store";

export function verifyStannpSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  const given = header.trim();
  for (const expected of [digest.toString("hex"), digest.toString("base64")]) {
    const a = Buffer.from(expected);
    const b = Buffer.from(given);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}

type Mailpiece = { id?: number | string; status?: string };
type Payload = { webhook_id?: string | number; event?: string; mailpieces?: Mailpiece[] };

export type WebhookOutcome = { duplicate: boolean; updated: number; unknown: number };

export async function handleStannpWebhook(payload: Payload, store: PostedStore): Promise<WebhookOutcome> {
  const outcome: WebhookOutcome = { duplicate: false, updated: 0, unknown: 0 };
  if (payload.event === "test_url") return outcome;
  if (payload.webhook_id !== undefined && !(await store.markWebhookEvent(String(payload.webhook_id)))) {
    return { ...outcome, duplicate: true };
  }
  if (payload.event !== "mailpiece_status") return outcome;

  for (const piece of payload.mailpieces ?? []) {
    const stannpId = Number(piece.id);
    const status = String(piece.status ?? "").toLowerCase();
    const letter = Number.isFinite(stannpId) ? await store.getLetterByStannpId(stannpId) : null;
    if (!letter || !status) {
      outcome.unknown++;
      continue;
    }

    let updated = null;
    switch (status) {
      case "dispatched":
        updated = await store.transition(letter.id, ["sent"], { status: "dispatched", stannpStatus: status });
        if (updated && updated.email) {
          const values = { name: updated.senderName, recipient: updated.recipientName };
          await sendEmail({
            to: updated.email,
            subject: fill(emailCopy.posted.subject, values),
            text: emailCopy.posted.body.map((line) => fill(line, values)).join("\n\n"),
          }).catch((error: unknown) => console.error(`"Posted" email not sent: ${error instanceof Error ? error.message : error}`));
        }
        break;
      case "local_delivery":
      case "delivered":
        // Delivery implies dispatch, if that webhook was missed.
        updated = await store.transition(letter.id, ["sent", "dispatched"], { status: "dispatched", stannpStatus: status });
        break;
      case "returned":
        updated = await store.transition(letter.id, ["sent", "dispatched"], { status: "returned", stannpStatus: status });
        break;
      case "cancelled":
        updated = await store.transition(letter.id, ["sent"], { status: "failed", stannpStatus: status, failureReason: "Cancelled at Stannp" });
        break;
      default: // e.g. printing
        updated = await store.transition(letter.id, ["sent", "dispatched"], { stannpStatus: status });
    }
    if (updated) outcome.updated++;
  }
  return outcome;
}
