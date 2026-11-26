import { copy } from "@/content/copy";
import { FindMpForm } from "@/components/FindMpForm";
import { RichText } from "@/components/RichText";
import styles from "./page.module.css";

const home = copy.home;

export default function HomePage() {
  return (
    <>
      <section className={styles.hero}>
        <h1>{home.headline}</h1>
        <p className={styles.intro}>{home.intro}</p>
        <FindMpForm />
      </section>

      <section className={styles.copy} aria-labelledby="why-heading">
        <h2 id="why-heading">{home.why.heading}</h2>
        {home.why.paragraphs.map((p, i) => (
          <p key={i}>
            <RichText text={p} />
          </p>
        ))}
        <p className={styles.source}>
          <a href={home.why.sourceUrl}>{home.why.sourceLabel}</a>
        </p>

        <div>
          {home.below.paragraphs.map((p, i) => (
            <p key={i}>
              <RichText text={p} />
            </p>
          ))}
        </div>

        <p className={styles.prompt}>
          <RichText text={home.below.prompt} />
        </p>
        <a href="#find-mp" className={styles.promptLink}>
          {home.below.promptLink}
        </a>
      </section>
    </>
  );
}
