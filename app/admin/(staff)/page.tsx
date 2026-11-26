import Link from "next/link";
import { sectors, findSector } from "@/content/sectors";
import { requireAdmin } from "@/lib/admin/auth";
import { getPostedStore } from "@/lib/posted/store";
import type { LetterFilter, LetterStatus, RecipientType } from "@/lib/posted/types";
import { approveAction } from "../actions";
import formStyles from "@/components/form.module.css";
import styles from "../admin.module.css";

export const instant = false;

const STATUSES: LetterStatus[] = [
  "awaiting_approval",
  "awaiting_confirmation",
  "queued",
  "sending",
  "sent",
  "dispatched",
  "returned",
  "failed",
  "rejected",
  "expired",
];

export const statusLabel = (s: LetterStatus) => s.replace(/_/g, " ");

export default async function LettersPage({ searchParams }: PageProps<"/admin">) {
  await requireAdmin();
  const params = await searchParams;
  const pick = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);

  const status = STATUSES.includes(pick("status") as LetterStatus) ? (pick("status") as LetterStatus) : undefined;
  const recipientType = ["mp", "minister"].includes(pick("recipient") ?? "") ? (pick("recipient") as RecipientType) : undefined;
  const sector = findSector(pick("sector") ?? "")?.slug;
  const filter: LetterFilter = { status, recipientType, sector };
  const letters = await getPostedStore().listLetters(filter);
  const approvable = letters.filter((l) => l.status === "awaiting_approval");

  return (
    <>
      <h1>Letters</h1>
      <form method="get" className={styles.filters}>
        <label>
          Status
          <select name="status" defaultValue={status ?? ""}>
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Recipient
          <select name="recipient" defaultValue={recipientType ?? ""}>
            <option value="">All</option>
            <option value="mp">MP</option>
            <option value="minister">Minister</option>
          </select>
        </label>
        <label>
          Sector
          <select name="sector" defaultValue={sector ?? ""}>
            <option value="">All</option>
            {sectors.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={formStyles.secondaryButton}>
          Filter
        </button>
      </form>

      {letters.length === 0 ? (
        <p>No letters match.</p>
      ) : (
        <form action={approveAction}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">
                    <span className="visually-hidden">Select</span>
                  </th>
                  <th scope="col">Received</th>
                  <th scope="col">Status</th>
                  <th scope="col">To</th>
                  <th scope="col">From</th>
                  <th scope="col">Sector</th>
                  <th scope="col">Constituency</th>
                  <th scope="col">Flags</th>
                  <th scope="col">
                    <span className="visually-hidden">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {letters.map((l) => (
                  <tr key={l.id}>
                    <td>
                      {l.status === "awaiting_approval" && (
                        <input type="checkbox" name="id" value={l.id} aria-label={`Select the letter from ${l.senderName}`} />
                      )}
                    </td>
                    <td>{new Date(l.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                    <td>
                      <span className={styles.status}>{statusLabel(l.status)}</span>
                    </td>
                    <td>{l.recipientName}</td>
                    <td>
                      {l.senderName}
                      <br />
                      {l.businessName}
                    </td>
                    <td>{findSector(l.sector)?.name ?? l.sector}</td>
                    <td>{l.constituencyName}</td>
                    <td className={styles.flag}>{l.flags.join(", ")}</td>
                    <td>
                      <Link href={`/admin/letters/${l.id}`}>Open</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {approvable.length > 0 && (
            <div className={styles.actions}>
              <button type="submit" className={formStyles.button}>
                Approve selected letters
              </button>
            </div>
          )}
        </form>
      )}
    </>
  );
}
