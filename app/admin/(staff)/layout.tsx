import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { signOut } from "../actions";
import formStyles from "@/components/form.module.css";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Admin | Common Sense Deal", robots: { index: false } };

// Staff pages read the session cookie on every request.
export const instant = false;

export default async function StaffLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <div className={styles.page}>
      {admin.dev && (
        <p className={styles.devBanner}>
          Development mode: Supabase sign-in isn’t configured, so you’re signed in as {admin.email}. This only works on your own computer.
        </p>
      )}
      <nav className={styles.nav} aria-label="Admin">
        <Link href="/admin">Letters</Link>
        <Link href="/admin/settings">Settings</Link>
        <Link href="/admin/audit">Audit log</Link>
        <span>{admin.email}</span>
        {!admin.dev && (
          <form action={signOut}>
            <button type="submit" className={formStyles.linkButton}>
              Sign out
            </button>
          </form>
        )}
      </nav>
      {children}
    </div>
  );
}
