import Link from "next/link";
import { notFound } from "next/navigation";
import { findSector } from "@/content/sectors";
import { requireAdmin } from "@/lib/admin/auth";
import { flagLabels, type Flag } from "@/lib/moderation";
import { getPostedStore } from "@/lib/posted/store";
import { approveAction, rejectAction, requeueAction } from "../../../actions";
import formStyles from "@/components/form.module.css";
import styles from "../../../admin.module.css";

export const instant = false;

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "–");

export default async function LetterPage({ params }: PageProps<"/admin/letters/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const letter = await getPostedStore().getLetter(id);
  if (!letter) notFound();
  const a = letter.recipientAddress;

  return (
    <>
      <p>
        <Link href="/admin">Back to letters</Link>
      </p>
      <h1>Letter to {letter.recipientName}</h1>

      <div className={styles.detail}>
        <div>
          <dl className={styles.dl}>
            <dt>Status</dt>
            <dd>
              <span className={styles.status}>{letter.status.replace(/_/g, " ")}</span>
            </dd>
            {letter.flags.length > 0 && (
              <>
                <dt>Flags</dt>
                <dd className={styles.flag}>{letter.flags.map((f) => flagLabels[f as Flag] ?? f).join(", ")}</dd>
              </>
            )}
            {letter.anonymisedAt && (
              <>
                <dt>Personal data</dt>
                <dd>Removed {when(letter.anonymisedAt)} under the retention policy</dd>
              </>
            )}
            <dt>Posted to</dt>
            <dd>{[a.firstname, a.lastname].filter(Boolean).join(" ") + "\n" + [a.company, a.address1, a.address2, a.city, a.postcode].filter(Boolean).join("\n")}</dd>
            <dt>From</dt>
            <dd>{`${letter.senderName}\n${letter.senderRole}, ${letter.businessName}\n${letter.businessAddress}`}</dd>
            <dt>Email</dt>
            <dd>{letter.email}</dd>
            <dt>Sector</dt>
            <dd>{findSector(letter.sector)?.name ?? letter.sector}</dd>
            <dt>Constituency</dt>
            <dd>{letter.constituencyName}</dd>
            <dt>Received</dt>
            <dd>{when(letter.createdAt)}</dd>
            <dt>Confirmed</dt>
            <dd>{when(letter.confirmedAt)}</dd>
            {letter.approvedAt && (
              <>
                <dt>Approved</dt>
                <dd>{`${when(letter.approvedAt)} by ${letter.approvedBy}`}</dd>
              </>
            )}
            {letter.rejectedAt && (
              <>
                <dt>Rejected</dt>
                <dd>{`${when(letter.rejectedAt)} by ${letter.rejectedBy}${letter.rejectionReason ? `: ${letter.rejectionReason}` : ""}`}</dd>
              </>
            )}
            {letter.sentAt && (
              <>
                <dt>Sent to Stannp</dt>
                <dd>
                  {when(letter.sentAt)}
                  {letter.stannpTest ? " (test mode: not posted)" : ""}
                  {letter.stannpCostPence !== null ? `, £${(letter.stannpCostPence / 100).toFixed(2)}` : ""}
                  {letter.stannpPdfUrl && (
                    <>
                      {" · "}
                      <a href={letter.stannpPdfUrl}>Stannp’s proof PDF</a>
                    </>
                  )}
                </dd>
              </>
            )}
            {letter.failureReason && (
              <>
                <dt>Failure</dt>
                <dd className={styles.flag}>{letter.failureReason}</dd>
              </>
            )}
          </dl>

          {letter.status === "awaiting_approval" && (
            <>
              <form action={approveAction} className={styles.actions}>
                <input type="hidden" name="id" value={letter.id} />
                <button type="submit" className={formStyles.button}>
                  Approve this letter
                </button>
              </form>
              <form action={rejectAction} className={styles.actions}>
                <input type="hidden" name="id" value={letter.id} />
                <label className={formStyles.label} htmlFor="reason">
                  Reason for rejecting (internal only)
                </label>
                <input id="reason" name="reason" className={formStyles.input} />
                <button type="submit" className={formStyles.secondaryButton}>
                  Reject this letter
                </button>
              </form>
            </>
          )}
          {letter.status === "failed" && (
            <form action={requeueAction} className={styles.actions}>
              <input type="hidden" name="id" value={letter.id} />
              <button type="submit" className={formStyles.secondaryButton}>
                Try posting again
              </button>
            </form>
          )}
        </div>

        {!letter.anonymisedAt && (
        <div>
          <h2>The PDF that is posted</h2>
          <iframe className={styles.pdf} src={`/admin/letters/${letter.id}/pdf`} title={`PDF of the letter from ${letter.senderName}`} />
          <p>
            <a href={`/admin/letters/${letter.id}/pdf`}>Open the PDF</a>
          </p>
        </div>
        )}
      </div>
    </>
  );
}
