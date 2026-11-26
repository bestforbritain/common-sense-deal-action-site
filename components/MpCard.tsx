import Image from "next/image";
import { copy, fill } from "@/content/copy";
import type { Constituency } from "@/lib/constituencies/types";
import styles from "./MpCard.module.css";

const text = copy.action;

/** The MP for a constituency, with the edge cases from the brief (vacant seat, Speaker). */
export function MpCard({ constituency }: { constituency: Constituency }) {
  const { mp, name } = constituency;

  if (!mp) {
    return (
      <section className={styles.card} aria-labelledby="mp-heading">
        <div>
          <h1 id="mp-heading" className={styles.name}>
            {fill(text.vacantLine, { constituency: name })}
          </h1>
          <p className={styles.note}>{fill(copy.mp.vacant, { constituency: name })}</p>
        </div>
      </section>
    );
  }

  const line = mp.isSpeaker
    ? fill(text.speakerLine, { name: mp.displayName, constituency: name })
    : fill(text.mpLine, { name: mp.displayName, party: mp.party, constituency: name });

  return (
    <section className={styles.card} aria-labelledby="mp-heading">
      <Image
        src={mp.thumbnailUrl}
        alt={fill(text.photoAlt, { name: mp.displayName })}
        width={120}
        height={120}
        className={styles.photo}
        priority
      />
      <div>
        <h1 id="mp-heading" className={styles.name}>
          {line}
        </h1>
        {mp.isSpeaker && (
          <p className={styles.note}>{fill(copy.mp.speaker, { name: mp.displayName, constituency: name })}</p>
        )}
      </div>
    </section>
  );
}
