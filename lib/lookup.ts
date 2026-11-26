/**
 * Postcode → constituency, via postcodes.io. Server-side only.
 *
 * Behaviour of postcodes.io, checked 26 November 2026 (phase0/phase0-report.md §1):
 * - valid GB/NI postcode: 200 with `codes.parliamentary_constituency_2024`
 * - Channel Islands / Isle of Man: 200 with a null constituency
 * - terminated: 404, then 200 from /terminated_postcodes
 * - invalid or non-geographic (e.g. BX): 404
 *
 * The site covers Great Britain only (decision 26 November 2026), so Northern Ireland
 * is "not covered" alongside the Channel Islands and Isle of Man.
 *
 * Never log or return the postcode itself.
 */
import { compactPostcode, isPostcodeFormat } from "@/lib/postcode";
import type { Constituency } from "@/lib/constituencies/types";

export const POSTCODES_IO = "https://api.postcodes.io";
const COVERED_COUNTRIES = new Set(["England", "Scotland", "Wales"]);

export type LookupResult =
  | { kind: "ok"; constituency: { slug: string; name: string } }
  | { kind: "invalid-format" }
  | { kind: "not-recognised" }
  | { kind: "retired"; year: number }
  | { kind: "not-covered" }
  | { kind: "unavailable" };

export type LookupDeps = {
  fetch: typeof fetch;
  getConstituencyByCode: (onsCode: string) => Promise<Constituency | null>;
  timeoutMs?: number;
};

type PostcodeResponse = {
  status: number;
  result?: {
    country: string;
    codes?: { parliamentary_constituency_2024?: string | null };
  };
};

type TerminatedResponse = { status: number; result?: { year_terminated: number } };

export async function lookupPostcode(input: string, deps: LookupDeps): Promise<LookupResult> {
  if (!isPostcodeFormat(input)) return { kind: "invalid-format" };
  const postcode = compactPostcode(input);
  const timeout = deps.timeoutMs ?? 5000;

  try {
    const res = await deps.fetch(`${POSTCODES_IO}/postcodes/${postcode}`, { signal: AbortSignal.timeout(timeout) });

    if (res.status === 404) {
      const terminated = await deps.fetch(`${POSTCODES_IO}/terminated_postcodes/${postcode}`, {
        signal: AbortSignal.timeout(timeout),
      });
      if (terminated.ok) {
        const body = (await terminated.json()) as TerminatedResponse;
        if (body.result?.year_terminated) return { kind: "retired", year: body.result.year_terminated };
      }
      return { kind: "not-recognised" };
    }

    if (!res.ok) return { kind: "unavailable" };

    const body = (await res.json()) as PostcodeResponse;
    const country = body.result?.country ?? "";
    const code = body.result?.codes?.parliamentary_constituency_2024 ?? null;

    if (!COVERED_COUNTRIES.has(country)) return { kind: "not-covered" };
    // ONS uses codes like E99999999 for "no constituency".
    if (!code || code.endsWith("99999999")) return { kind: "not-covered" };

    const constituency = await deps.getConstituencyByCode(code);
    if (!constituency) return { kind: "unavailable" };
    if (constituency.nation === "northern-ireland") return { kind: "not-covered" };

    return { kind: "ok", constituency: { slug: constituency.slug, name: constituency.name } };
  } catch {
    return { kind: "unavailable" };
  }
}
