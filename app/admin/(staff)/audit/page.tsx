import { requireAdmin } from "@/lib/admin/auth";
import { getPostedStore } from "@/lib/posted/store";
import styles from "../../admin.module.css";

export const instant = false;

export default async function AuditPage() {
  await requireAdmin();
  const entries = await getPostedStore().listAudit(200);
  return (
    <>
      <h1>Audit log</h1>
      <p>Every admin action, newest first.</p>
      {entries.length === 0 ? (
        <p>Nothing yet.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Who</th>
                <th scope="col">Action</th>
                <th scope="col">Letter</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "medium" })}</td>
                  <td>{e.actor}</td>
                  <td>{e.action}</td>
                  <td>{e.target ? <a href={`/admin/letters/${e.target}`}>{e.target.slice(0, 8)}</a> : "–"}</td>
                  <td>
                    <code>{JSON.stringify(e.details)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
