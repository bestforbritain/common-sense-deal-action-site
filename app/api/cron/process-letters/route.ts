import { expireUnconfirmed, processQueue } from "@/lib/posted/service";

export const maxDuration = 300;

/**
 * Every 10 minutes (vercel.json): expire unconfirmed letters older than 48 hours,
 * then post queued letters within the caps. Posting goes through postLetter(), which
 * uses Stannp test mode unless every live-posting condition holds.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  const expired = await expireUnconfirmed();
  const queue = await processQueue();
  return Response.json({ expired, ...queue });
}
