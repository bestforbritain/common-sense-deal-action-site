import { getPostedStore } from "@/lib/posted/store";
import { handleStannpWebhook, verifyStannpSignature } from "@/lib/posted/webhooks";

/**
 * POST /api/webhooks/stannp: status updates from Stannp.
 * Refused unless STANNP_WEBHOOK_SECRET is set and the signature matches.
 */
export async function POST(request: Request) {
  const secret = process.env.STANNP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Stannp webhook received but STANNP_WEBHOOK_SECRET is not set.");
    return new Response("Not configured", { status: 503 });
  }
  const raw = await request.text();
  if (!verifyStannpSignature(raw, request.headers.get("x-stannp-signature"), secret)) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  const outcome = await handleStannpWebhook(payload as Parameters<typeof handleStannpWebhook>[0], getPostedStore());
  return Response.json(outcome);
}
