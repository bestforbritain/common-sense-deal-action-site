import { parsePostedInput } from "@/lib/posted/parseInput";
import { previewLetter } from "@/lib/posted/service";
import { checkRateLimit, PREVIEW_RATE_LIMIT } from "@/lib/rateLimit";

/**
 * POST /api/letters/preview → the A4 PDF exactly as it would be posted.
 * The PDF's SHA-256 comes back in the X-Pdf-Sha256 header; submit must send it back.
 * Nothing is stored.
 */
export async function POST(request: Request) {
  if (!(await checkRateLimit(PREVIEW_RATE_LIMIT, request.headers))) {
    return Response.json({ error: "rate-limited" }, { status: 429 });
  }
  const input = parsePostedInput(await request.json().catch(() => null));
  if (!input) return Response.json({ error: "bad-request" }, { status: 400 });

  const result = await previewLetter(input);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.error === "bad-request" ? 400 : 422 });

  return new Response(result.pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="letter-preview.pdf"',
      "x-pdf-sha256": result.sha256,
      "cache-control": "no-store",
    },
  });
}
