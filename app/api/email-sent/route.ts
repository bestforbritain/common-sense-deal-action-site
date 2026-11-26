import { copy } from "@/content/copy";
import { findSector } from "@/content/sectors";
import { getConstituencyBySlug } from "@/lib/constituencies/store";
import { checkRateLimit, clientIp, EMAIL_SENT_RATE_LIMIT } from "@/lib/rateLimit";
import { recordEmailSent, recordMarketingOptIn } from "@/lib/records";
import { verifyTurnstile } from "@/lib/turnstile";
import { isEmailFormat } from "@/lib/validation";

/**
 * POST /api/email-sent
 * { constituencySlug, sectorSlug, turnstileToken?, optIn?: boolean, email?: string }
 *
 * Records a self-reported "I've sent it" (sector, constituency, time). An email
 * address is stored only if the person ticked the marketing opt-in.
 */
export async function POST(request: Request) {
  if (!(await checkRateLimit(EMAIL_SENT_RATE_LIMIT, request.headers))) {
    return Response.json({ ok: false, error: "rate-limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  if (!(await verifyTurnstile(body.turnstileToken, clientIp(request.headers)))) {
    return Response.json({ ok: false, error: "bot-check" }, { status: 403 });
  }

  const sector = typeof body.sectorSlug === "string" ? findSector(body.sectorSlug) : undefined;
  const constituency =
    typeof body.constituencySlug === "string" ? await getConstituencyBySlug(body.constituencySlug) : null;
  if (!sector || !constituency || constituency.nation === "northern-ireland") {
    return Response.json({ ok: false, error: "bad-request" }, { status: 400 });
  }

  const optIn = body.optIn === true;
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (optIn && !isEmailFormat(email)) {
    return Response.json({ ok: false, error: "email-format" }, { status: 400 });
  }

  try {
    await recordEmailSent({ onsCode: constituency.onsCode, sector: sector.slug });
    if (optIn) {
      // The wording recorded is the server's copy, not anything sent by the browser.
      await recordMarketingOptIn({
        email,
        wordingVersion: copy.email.marketing.version,
        wording: copy.email.marketing.optIn,
        source: "email-mp",
      });
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Recording failed");
    return Response.json({ ok: false, error: "unavailable" }, { status: 503 });
  }

  return Response.json({ ok: true });
}
