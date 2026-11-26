"use client";

import { copy, fill } from "@/content/copy";
import { postedCopy } from "@/content/postedLetter";
import type { ActionProps } from "./registry";
import { PostedLetterComposer } from "./PostedLetterComposer";
import styles from "./actions.module.css";

/** Send a posted letter to the MP or the Minister, printed and posted via Stannp. */
export function PostedLetterAction({ title, summary, constituency, sector, verified }: ActionProps) {
  const { mp } = constituency;
  return (
    <section className={styles.action} aria-labelledby="action-posted-letter">
      <h3 id="action-posted-letter">{title}</h3>
      <p>{summary}</p>
      {mp && !mp.postalAddress && <p>{fill(copy.mp.noPostalAddress, { name: mp.displayName })}</p>}
      {verified ? (
        <PostedLetterComposer constituency={constituency} sector={sector} verified={verified} />
      ) : (
        <p className={styles.comingSoon}>
          <a href="#check-heading">{postedCopy.needsPostcode}</a>
        </p>
      )}
    </section>
  );
}
