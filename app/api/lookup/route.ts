import { getConstituencyByCode } from "@/lib/constituencies/store";
import { lookupPostcode } from "@/lib/lookup";
import { checkRateLimit, LOOKUP_RATE_LIMIT } from "@/lib/rateLimit";

/**
 * POST /api/lookup  { postcode: string }
 *
 * The postcode arrives in the request body only, never the URL, and is never logged.
 */
export async function POST(request: Request) {
  if (!(await checkRateLimit(LOOKUP_RATE_LIMIT, request.headers))) {
    return Response.json({ kind: "rate-limited" }, { status: 429 });
  }

  let postcode: unknown;
  try {
    ({ postcode } = (await request.json()) as { postcode?: unknown });
  } catch {
    return Response.json({ kind: "invalid-format" }, { status: 400 });
  }
  if (typeof postcode !== "string" || postcode.length > 16) {
    return Response.json({ kind: "invalid-format" }, { status: 400 });
  }

  const result = await lookupPostcode(postcode, { fetch, getConstituencyByCode });
  const status = result.kind === "unavailable" ? 503 : result.kind === "invalid-format" ? 400 : 200;
  return Response.json(result, { status, headers: { "cache-control": "no-store" } });
}
