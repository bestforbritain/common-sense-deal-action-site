import { getAdmin } from "@/lib/admin/auth";
import { getPostedStore } from "@/lib/posted/store";

/** The stored PDF for one letter: exactly what is (or will be) posted. Staff only. */
export async function GET(_request: Request, { params }: RouteContext<"/admin/letters/[id]/pdf">) {
  if (!(await getAdmin())) return new Response("Unauthorised", { status: 401 });
  const { id } = await params;
  const store = getPostedStore();
  const letter = await store.getLetter(id);
  if (!letter) return new Response("Not found", { status: 404 });
  const pdf = await store.getPdf(letter);
  return new Response(pdf as BodyInit, {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${id}.pdf"`, "cache-control": "private, no-store" },
  });
}
