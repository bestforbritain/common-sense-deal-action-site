import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authConfigured, getAdmin } from "@/lib/admin/auth";
import { LoginForm } from "./LoginForm";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Admin sign-in | Common Sense Deal", robots: { index: false } };
export const instant = false;

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className={styles.page}>
      <h1>Admin sign-in</h1>
      {authConfigured() ? (
        <>
          <p>Enter your Best for Britain email address. If it’s on the staff list, we’ll email you a sign-in link.</p>
          <LoginForm />
        </>
      ) : (
        <p>Admin sign-in isn’t set up yet. It needs SUPABASE_URL, SUPABASE_ANON_KEY and ADMIN_EMAILS.</p>
      )}
    </div>
  );
}
