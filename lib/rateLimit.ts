/**
 * Fixed-window rate limiting for public routes.
 *
 * Production: the Supabase function `rate_limit_hit` (shared across serverless instances).
 * Local/tests: an in-memory counter per process.
 *
 * Keys are a salted SHA-256 hash of the route and client IP, so raw IPs are never stored.
 */
import { createHash } from "node:crypto";
import { getSupabase } from "@/lib/supabase";

export type RateLimitRule = { route: string; windowSeconds: number; max: number };

export const LOOKUP_RATE_LIMIT: RateLimitRule = { route: "lookup", windowSeconds: 600, max: 30 };
export const PREVIEW_RATE_LIMIT: RateLimitRule = { route: "letter-preview", windowSeconds: 600, max: 40 };
export const SUBMIT_RATE_LIMIT: RateLimitRule = { route: "letter-submit", windowSeconds: 3600, max: 5 };
export const EMAIL_SENT_RATE_LIMIT: RateLimitRule = { route: "email-sent", windowSeconds: 3600, max: 10 };

const memory = new Map<string, { windowStart: number; hits: number }>();

export function clientIp(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

export function rateLimitKey(rule: RateLimitRule, ip: string): string {
  const salt = process.env.RATE_LIMIT_SALT ?? "local-development-salt";
  return createHash("sha256").update(`${salt}:${rule.route}:${ip}`).digest("hex");
}

export function hitInMemory(key: string, rule: RateLimitRule, now = Date.now()): boolean {
  const windowStart = Math.floor(now / 1000 / rule.windowSeconds) * rule.windowSeconds;
  const entry = memory.get(key);
  if (!entry || entry.windowStart !== windowStart) {
    memory.set(key, { windowStart, hits: 1 });
    return true;
  }
  entry.hits += 1;
  return entry.hits <= rule.max;
}

/** Records a hit; returns true if the request is allowed. */
export async function checkRateLimit(rule: RateLimitRule, headers: Headers): Promise<boolean> {
  const key = rateLimitKey(rule, clientIp(headers));
  const supabase = getSupabase();
  if (!supabase) return hitInMemory(key, rule);

  const { data, error } = await supabase.rpc("rate_limit_hit", {
    p_key: key,
    p_window_seconds: rule.windowSeconds,
    p_max: rule.max,
  });
  if (error) {
    // Fail open: a broken limiter shouldn't stop people using the site.
    console.error(`Rate limiter unavailable for ${rule.route}: ${error.message}`);
    return true;
  }
  return data === true;
}
