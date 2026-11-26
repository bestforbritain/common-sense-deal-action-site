import { getAdmin } from "@/lib/admin/auth";
import { nameForOns, sectorName } from "@/lib/admin/stats";
import { toCsv } from "@/lib/csv";
import { getPostedStore } from "@/lib/posted/store";
import { listEmailSends, listOptIns } from "@/lib/records";

/** CSV exports for staff. Each download is written to the audit log. */
export async function GET(_request: Request, { params }: RouteContext<"/admin/export/[kind]">) {
  const admin = await getAdmin();
  if (!admin) return new Response("Unauthorised", { status: 401 });
  const { kind } = await params;
  let csv: string;

  if (kind === "letters") {
    const letters = await getPostedStore().allLetters();
    csv = toCsv(
      ["id", "created_at", "status", "recipient_type", "recipient", "sector", "constituency", "ons_code", "flags", "confirmed_at", "approved_at", "approved_by", "rejected_at", "sent_at", "stannp_test", "stannp_cost_pence", "stannp_status"],
      letters.map((l) => [l.id, l.createdAt, l.status, l.recipientType, l.recipientName, sectorName(l.sector), l.constituencyName, l.onsCode, l.flags, l.confirmedAt, l.approvedAt, l.approvedBy, l.rejectedAt, l.sentAt, l.stannpTest, l.stannpCostPence, l.stannpStatus]),
    );
  } else if (kind === "emails") {
    const emails = await listEmailSends();
    csv = toCsv(["created_at", "sector", "constituency", "ons_code"], emails.map((e) => [e.createdAt, sectorName(e.sector), nameForOns(e.onsCode), e.onsCode]));
  } else if (kind === "optins") {
    const optins = await listOptIns();
    csv = toCsv(["email", "opted_in_at", "wording_version", "wording", "source"], optins.map((o) => [o.email, o.optedInAt, o.wordingVersion, o.wording, o.source]));
  } else {
    return new Response("Not found", { status: 404 });
  }

  await getPostedStore().addAudit({ actor: admin.email, action: "export", target: null, details: { kind } });
  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="common-sense-deal-${kind}-${date}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
