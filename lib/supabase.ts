/**
 * Server-only Supabase client using the service role. Never import this from a
 * Client Component: the service key must not reach the browser.
 *
 * Returns null when Supabase isn't configured, so local development and tests
 * run against data/constituencies.json instead.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}
