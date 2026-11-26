import { copy, fill } from "@/content/copy";
import type { ActionProps } from "./registry";
import styles from "./actions.module.css";

/** Send a posted letter. Phase 2: availability rules only; the flow is built in Phase 4. */
export function PostedLetterAction({ title, summary, constituency }: ActionProps) {
  const { mp } = constituency;
  return (
    <section className={styles.action} aria-labelledby="action-posted-letter">
      <h3 id="action-posted-letter">{title}</h3>
      <p>{summary}</p>
      {mp && !mp.postalAddress && <p>{fill(copy.mp.noPostalAddress, { name: mp.displayName })}</p>}
      <p className={styles.comingSoon}>{copy.action.comingSoon}</p>
    </section>
  );
}
