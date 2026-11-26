"use client";

import { copy, fill } from "@/content/copy";
import type { ActionProps } from "./registry";
import { EmailComposer } from "./EmailComposer";
import styles from "./actions.module.css";

/** Email your MP: availability rules, then the composer once the postcode is confirmed. */
export function EmailMpAction({ title, summary, constituency, sector, verified }: ActionProps) {
  const { mp } = constituency;
  // Vacant seat: the MP card already explains; there's nobody to email.
  if (!mp) return null;

  if (!mp.email) {
    return (
      <section className={styles.action} aria-labelledby="action-email-mp">
        <h3 id="action-email-mp">{title}</h3>
        <p>{fill(copy.mp.noEmail, { name: mp.displayName })}</p>
      </section>
    );
  }

  return (
    <section className={styles.action} aria-labelledby="action-email-mp">
      <h3 id="action-email-mp">{title}</h3>
      <p>{summary}</p>
      {verified ? (
        <EmailComposer constituency={constituency} sector={sector} mp={{ ...mp, email: mp.email }} verified={verified} />
      ) : (
        <p className={styles.comingSoon}>
          <a href="#check-heading">{copy.email.needsPostcode}</a>
        </p>
      )}
    </section>
  );
}
