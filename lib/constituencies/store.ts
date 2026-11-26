/**
 * Read/write access to the constituency snapshot.
 *
 * Production: Supabase table `constituencies`. Local/tests: data/constituencies.json.
 * If a constituency is missing from the snapshot, falls back to a live Members API
 * call (the brief: "live API calls only as a fallback").
 */
import localSnapshot from "@/data/constituencies.json";
import ons from "@/data/ons-pcon-2024.json";
import { fetchJson } from "@/lib/http";
import { getSupabase } from "@/lib/supabase";
import { buildRecordLive } from "./live";
import type { Constituency } from "./types";

type Row = {
  ons_code: string;
  name: string;
  slug: string;
  nation: Constituency["nation"];
  mp: Constituency["mp"];
  refreshed_at: string;
};

const fromRow = (r: Row): Constituency => ({
  onsCode: r.ons_code,
  name: r.name,
  slug: r.slug,
  nation: r.nation,
  mp: r.mp,
  refreshedAt: r.refreshed_at,
});

const toRow = (c: Constituency): Row => ({
  ons_code: c.onsCode,
  name: c.name,
  slug: c.slug,
  nation: c.nation,
  mp: c.mp,
  refreshed_at: c.refreshedAt,
});

const local = localSnapshot as Constituency[];

async function findOne(column: "slug" | "ons_code", value: string): Promise<Constituency | null> {
  const supabase = getSupabase();
  if (!supabase) {
    return local.find((c) => (column === "slug" ? c.slug : c.onsCode) === value) ?? null;
  }
  const { data, error } = await supabase.from("constituencies").select("*").eq(column, value).maybeSingle<Row>();
  if (error) throw new Error(`Constituency lookup failed: ${error.message}`);
  return data ? fromRow(data) : null;
}

export function getConstituencyBySlug(slug: string): Promise<Constituency | null> {
  return findOne("slug", slug);
}

/** Looks up by ONS code, falling back to a live Members API call if the snapshot lacks it. */
export async function getConstituencyByCode(onsCode: string): Promise<Constituency | null> {
  const found = await findOne("ons_code", onsCode);
  if (found) return found;
  const onsEntry = ons.find((o) => o.code === onsCode);
  if (!onsEntry) return null;
  return buildRecordLive(onsEntry, fetchJson);
}

export async function saveSnapshot(records: Constituency[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase isn't configured; use `npm run snapshot` to refresh the local file.");
  const { error } = await supabase.from("constituencies").upsert(records.map(toRow), { onConflict: "ons_code" });
  if (error) throw new Error(`Saving the snapshot failed: ${error.message}`);
}
