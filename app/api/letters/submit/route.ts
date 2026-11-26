import { copy } from "@/content/copy";
import { EmailNotConfiguredError } from "@/lib/mailer";
import { parsePostedInput } from "@/lib/posted/parseInput";
import { submitLetter } from "@/lib/posted/service";
import { checkRateLimit, clientIp, SUBMIT_RATE_LIMIT } from "@/lib/rateLimit";
import { recordMarketingOptIn } from "@/lib/records";
import { verifyTurnstile } from "@/lib/turnstile";

/**
 * POST /api/letters/submit
 * PostedInput + { previewSha256, consent: true, optIn?: boolean, turnstileToken? }
 */
export async function POST(request: Request) {
  if (!(await checkRateLimit(SUBMIT_RATE_LIMIT, request.headers))) {
    return Response.json({ ok: false, error: "rate-limited" }, { status: 429 });
  }
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const input = parsePostedInput(body);
  if (!input || !body || typeof body.previewSha256 !== "string") {
    return Response.json({ ok: false, error: "bad-request" }, { status: 400 });
  }
  if (body.consent !== true) return Response.json({ ok: false, error: "consent" }, { status: 400 });
  if (!(await verifyTurnstile(body.turnstileToken, clientIp(request.headers)))) {
    return Response.json({ ok: false, error: "bot-check" }, { status: 403 });
  }

  try {
    const result = await submitLetter({ ...input, previewSha256: body.previewSha256 }, { origin: new URL(request.url).origin });
    if (!result.ok) {
      const status = result.error === "duplicate" ? 409 : 400;
      return Response.json(result, { status });
    }
    if (body.optIn === true) {
      await recordMarketingOptIn({
        email: input.email.trim(),
        wordingVersion: copy.email.marketing.version,
        wording: copy.email.marketing.optIn,
        source: "posted-letter",
      });
    }
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) console.error("Letter saved but the confirmation email couldn't be sent: no email provider.");
    else console.error(error instanceof Error ? error.message : "Submitting a letter failed");
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }
}
