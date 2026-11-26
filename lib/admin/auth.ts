/**
 * Admin sign-in: Supabase Auth magic links, restricted to the staff emails listed in
 * the ADMIN_EMAILS environment variable (comma-separated).
 *
 * Local development without Supabase Auth: a "dev@localhost" admin, with a banner,
 * so the admin area can be tried. This never applies outside `next dev`.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export type Admin = { email: string; dev: boolean };

export function adminAllowlist(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdmin(email: string | null | undefined): boolean {
  return Boolean(email) && adminAllowlist().includes(email!.toLowerCase());
}

export const authConfigured = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

export async function supabaseAuthClient() {
  const store = await cookies();
  return createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies can't be set; proxy.ts refreshes them.
        }
      },
    },
  });
}

export async function getAdmin(): Promise<Admin | null> {
  // Always decided per request: admin pages must never be prerendered or cached.
  await connection();
  if (!authConfigured()) {
    return process.env.NODE_ENV === "development" ? { email: "dev@localhost", dev: true } : null;
  }
  const supabase = await supabaseAuthClient();
  const { data } = await supabase.auth.getUser();
  return isAllowedAdmin(data.user?.email) ? { email: data.user!.email!.toLowerCase(), dev: false } : null;
}

/** For admin pages and server actions: signed-in, allowlisted staff only. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
