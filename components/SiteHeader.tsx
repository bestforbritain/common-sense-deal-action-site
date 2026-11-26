import Image from "next/image";
import Link from "next/link";
import { copy } from "@/content/copy";
import styles from "./SiteHeader.module.css";

// Placeholder logo: a crop of the live site's header, used until the new logo is ready.
import logo from "@/public/logo-placeholder.jpg";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.logoLink}>
          <Image src={logo} alt={copy.header.logoAlt} priority className={styles.logo} />
        </Link>
      </div>
    </header>
  );
}
