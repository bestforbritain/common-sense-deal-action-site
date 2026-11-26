/**
 * Cloudflare Turnstile verification for forms that write data.
 *
 * With no TURNSTILE_SECRET_KEY: allowed locally and on Vercel preview deployments,
 * refused on the live site (fail closed), so a missing key can't silently switch bot
 * protection off where it matters. VERCEL_ENV is "production" only for the live site.
 */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(token: unknown, ip: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.VERCEL_ENV === "production") {
      console.error("TURNSTILE_SECRET_KEY is not set: refusing form submissions.");
      return false;
    }
    return true;
  }
  if (typeof token !== "string" || !token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const res = await fetchImpl(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(5000) });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
