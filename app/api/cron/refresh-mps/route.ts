import { revalidateTag } from "next/cache";
import ons from "@/data/ons-pcon-2024.json";
import { buildSnapshot } from "@/lib/constituencies/snapshot";
import { saveSnapshot } from "@/lib/constituencies/store";
import { fetchJson } from "@/lib/http";

export const maxDuration = 300;

/**
 * Daily refresh of the constituency/MP snapshot (scheduled in vercel.json).
 * Vercel sends `Authorization: Bearer $CRON_SECRET`. If validation fails
 * (not 650 rows, an unmatched name), nothing is written and the job returns 500.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorised", { status: 401 });
  }

  try {
    const records = await buildSnapshot({ fetchJson, ons });
    await saveSnapshot(records);
    revalidateTag("constituencies", "max");
    return Response.json({
      ok: true,
      constituencies: records.length,
      vacant: records.filter((r) => !r.mp).length,
      noEmail: records.filter((r) => r.mp && !r.mp.email).length,
    });
  } catch (error) {
    console.error(`MP snapshot refresh failed: ${error instanceof Error ? error.message : String(error)}`);
    return Response.json({ ok: false }, { status: 500 });
  }
}
