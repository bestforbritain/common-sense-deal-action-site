import { notFound } from "next/navigation";
import { connection } from "next/server";
import { devOutbox } from "@/lib/mailer";

export const instant = false;

/** Development only: emails the site would have sent, until a provider is set up. */
export default async function OutboxPage() {
  await connection();
  if (process.env.NODE_ENV !== "development") notFound();
  const emails = devOutbox();
  return (
    <div style={{ maxWidth: "48rem", margin: "0 auto", padding: "2rem 1rem" }}>
      <h1>Development outbox</h1>
      <p>Emails are kept in memory until the server restarts. Newest first.</p>
      {emails.length === 0 && <p>No emails yet.</p>}
      {emails.map((e, i) => (
        <article key={i} style={{ borderTop: "2px solid var(--colour-navy)", padding: "1rem 0" }}>
          <p>
            <strong>To:</strong> {e.to}
            <br />
            <strong>Subject:</strong> {e.subject}
            <br />
            <small>{e.sentAt}</small>
          </p>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{e.text}</pre>
        </article>
      ))}
    </div>
  );
}
