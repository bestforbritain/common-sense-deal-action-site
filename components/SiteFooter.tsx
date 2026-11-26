import { copy } from "@/content/copy";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.organisation}>{copy.footer.organisation}</p>
        <ul className={styles.links}>
          {copy.footer.links.map((link) => (
            <li key={link.label}>
              {/* Placeholder hrefs render as plain text so there are no broken links. */}
              {link.href.startsWith("[TODO") ? (
                <span>
                  {link.label} {link.href}
                </span>
              ) : (
                <a href={link.href}>{link.label}</a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
