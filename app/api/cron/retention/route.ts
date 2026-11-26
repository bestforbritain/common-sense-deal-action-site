import { runRetention } from "@/lib/posted/retention";
import { getPostedStore } from "@/lib/posted/store";

export const maxDuration = 300;

/** Daily (vercel.json): removes personal data from letters past the retention period. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }
  return Response.json(await runRetention(getPostedStore()));
}
