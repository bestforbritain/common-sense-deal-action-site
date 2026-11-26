import { requireAdmin } from "@/lib/admin/auth";
import { getStats, type Count } from "@/lib/admin/stats";
import styles from "../../admin.module.css";

export const instant = false;

const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function CountTable({ caption, rows, limit }: { caption: string; rows: Count[]; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.caption}>
          {caption}
          {limit && rows.length > limit ? ` (top ${limit} of ${rows.length})` : ""}
        </caption>
        <thead>
          <tr>
            <th scope="col">{capitalise(caption.split(" by ")[1] ?? "group")}</th>
            <th scope="col" className={styles.number}>
              Count
            </th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 && (
            <tr>
              <td colSpan={2}>None yet</td>
            </tr>
          )}
          {shown.map((r) => (
            <tr key={r.label}>
              <td>{r.label}</td>
              <td className={styles.number}>{r.count.toLocaleString("en-GB")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function StatsPage() {
  await requireAdmin();
  const stats = await getStats();
  return (
    <>
      <h1>Stats and exports</h1>

      <h2>Exports</h2>
      <ul>
        <li>
          <a href="/admin/export/letters" download>Letters (CSV)</a>: status, sector, recipient and constituency, with no personal data.
        </li>
        <li>
          <a href="/admin/export/emails" download>Emails sent (CSV)</a>: self-reported, with sector and constituency.
        </li>
        <li>
          <a href="/admin/export/optins" download>Marketing opt-ins (CSV)</a>: email address, when they opted in and the exact wording they saw.
        </li>
      </ul>
      <p>Every export is recorded in the audit log.</p>

      <h2>Emails to MPs (self-reported): {stats.emails.total.toLocaleString("en-GB")}</h2>
      <div className={styles.statsGrid}>
        <CountTable caption="Emails by sector" rows={stats.emails.bySector} />
        <CountTable caption="Emails by constituency" rows={stats.emails.byConstituency} limit={20} />
      </div>

      <h2>Posted letters (confirmed): {stats.letters.total.toLocaleString("en-GB")}</h2>
      <div className={styles.statsGrid}>
        <CountTable caption="Letters by status" rows={stats.letters.byStatus} />
        <CountTable caption="Letters by recipient" rows={stats.letters.byRecipient} />
        <CountTable caption="Letters by sector" rows={stats.letters.bySector} />
        <CountTable caption="Letters by constituency" rows={stats.letters.byConstituency} limit={20} />
      </div>
    </>
  );
}
