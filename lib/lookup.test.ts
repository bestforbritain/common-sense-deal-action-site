import { describe, expect, it, vi } from "vitest";
import { lookupPostcode, type LookupDeps } from "./lookup";
import type { Constituency } from "./constituencies/types";

// Response shapes recorded from postcodes.io on 26 November 2026 (trimmed to the fields we use).
const responses: Record<string, { status: number; body: unknown }> = {
  "/postcodes/M11AE": {
    status: 200,
    body: { status: 200, result: { country: "England", codes: { parliamentary_constituency_2024: "E14001352" } } },
  },
  "/postcodes/BT11AA": {
    status: 200,
    body: { status: 200, result: { country: "Northern Ireland", codes: { parliamentary_constituency_2024: "N05000002" } } },
  },
  "/postcodes/GY11AA": {
    status: 200,
    body: { status: 200, result: { country: "Channel Islands", codes: { parliamentary_constituency_2024: "L99999999" } } },
  },
  "/postcodes/IM13PW": {
    status: 200,
    body: { status: 200, result: { country: "Isle of Man", codes: { parliamentary_constituency_2024: "M99999999" } } },
  },
  "/postcodes/E1W1UU": { status: 404, body: { status: 404, error: "Postcode not found" } },
  "/terminated_postcodes/E1W1UU": { status: 200, body: { status: 200, result: { year_terminated: 2015 } } },
  "/postcodes/BX11LT": { status: 404, body: { status: 404, error: "Postcode not found" } },
  "/terminated_postcodes/BX11LT": { status: 404, body: { status: 404, error: "Terminated postcode not found" } },
  "/postcodes/SW1A1AA": { status: 500, body: {} },
};

const manchesterCentral: Constituency = {
  onsCode: "E14001352",
  name: "Manchester Central",
  slug: "manchester-central",
  nation: "england",
  mp: null,
  refreshedAt: "2026-11-26T00:00:00.000Z",
};

function deps(overrides: Partial<LookupDeps> = {}): LookupDeps & { fetch: ReturnType<typeof vi.fn> } {
  const fetchMock = vi.fn(async (url: string) => {
    const path = new URL(url).pathname;
    const r = responses[path];
    if (!r) throw new Error(`Unexpected request ${path}`);
    return new Response(JSON.stringify(r.body), { status: r.status });
  });
  return {
    fetch: fetchMock as unknown as typeof fetch & ReturnType<typeof vi.fn>,
    getConstituencyByCode: async (code) => (code === "E14001352" ? manchesterCentral : null),
    ...overrides,
  } as LookupDeps & { fetch: ReturnType<typeof vi.fn> };
}

describe("lookupPostcode", () => {
  it("returns the constituency slug and name for a GB postcode", async () => {
    expect(await lookupPostcode("m1 1ae", deps())).toEqual({
      kind: "ok",
      constituency: { slug: "manchester-central", name: "Manchester Central" },
    });
  });

  it.each([
    ["Northern Ireland", "BT1 1AA"],
    ["Channel Islands", "GY1 1AA"],
    ["Isle of Man", "IM1 3PW"],
  ])("treats %s as not covered", async (_place, postcode) => {
    expect(await lookupPostcode(postcode, deps())).toEqual({ kind: "not-covered" });
  });

  it("reports the year a retired postcode was terminated", async () => {
    expect(await lookupPostcode("E1W 1UU", deps())).toEqual({ kind: "retired", year: 2015 });
  });

  it("reports unknown or non-geographic postcodes as not recognised", async () => {
    expect(await lookupPostcode("BX1 1LT", deps())).toEqual({ kind: "not-recognised" });
  });

  it("reports a postcodes.io error as unavailable", async () => {
    expect(await lookupPostcode("SW1A 1AA", deps())).toEqual({ kind: "unavailable" });
  });

  it("reports a network failure as unavailable", async () => {
    const d = deps({ fetch: (async () => { throw new TypeError("network"); }) as typeof fetch });
    expect(await lookupPostcode("M1 1AE", d)).toEqual({ kind: "unavailable" });
  });

  it("reports unavailable if the constituency isn't in the snapshot", async () => {
    expect(await lookupPostcode("M1 1AE", deps({ getConstituencyByCode: async () => null }))).toEqual({
      kind: "unavailable",
    });
  });

  it("rejects a badly formed postcode without calling postcodes.io", async () => {
    const d = deps();
    expect(await lookupPostcode("SW1A", d)).toEqual({ kind: "invalid-format" });
    expect(d.fetch).not.toHaveBeenCalled();
  });

  it("never includes the postcode in its result", async () => {
    for (const postcode of ["M1 1AE", "E1W 1UU", "BX1 1LT", "BT1 1AA"]) {
      const result = JSON.stringify(await lookupPostcode(postcode, deps()));
      expect(result.replace(/\s/g, "")).not.toContain(postcode.replace(/\s/g, ""));
    }
  });
});
