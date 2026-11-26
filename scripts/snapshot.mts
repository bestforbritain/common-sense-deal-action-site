/**
 * Writes data/constituencies.json from the Members API.
 *
 * This file is the local fallback used when Supabase isn't configured (local
 * development and tests). In production the daily cron route writes to Supabase.
 *
 * Run with: npm run snapshot
 */
import { writeFile } from "node:fs/promises";
import ons from "../data/ons-pcon-2024.json";
import { buildSnapshot } from "../lib/constituencies/snapshot";
import { fetchJson } from "../lib/http";

const records = await buildSnapshot({ fetchJson, ons });
await writeFile(new URL("../data/constituencies.json", import.meta.url), JSON.stringify(records, null, 1) + "\n");

const withMp = records.filter((r) => r.mp);
console.log(`Wrote ${records.length} constituencies (${withMp.length} with an MP).`);
console.log(`No email: ${withMp.filter((r) => !r.mp!.email).map((r) => `${r.mp!.displayName} (${r.name})`).join(", ") || "none"}`);
console.log(`No postal address: ${withMp.filter((r) => !r.mp!.postalAddress).map((r) => `${r.mp!.displayName} (${r.name})`).join(", ") || "none"}`);
