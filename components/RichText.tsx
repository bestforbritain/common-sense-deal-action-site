import { Fragment } from "react";
import { CampaignName } from "./CampaignName";
import styles from "./CampaignName.module.css";

/**
 * Renders a copy string:
 * - `{csd}` becomes the styled campaign name.
 * - `[[words]]` puts the same red block around those words, keeping their case.
 */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/(\{csd\}|\[\[[^\]]+\]\])/);
  return (
    <>
      {parts.map((part, i) => {
        if (part === "{csd}") return <CampaignName key={i} />;
        if (part.startsWith("[[") && part.endsWith("]]")) {
          return (
            <span key={i} className={styles.csd}>
              {part.slice(2, -2)}
            </span>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
