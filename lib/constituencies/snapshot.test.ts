import { describe, expect, it } from "vitest";
import ons from "@/data/ons-pcon-2024.json";
import snapshot from "@/data/constituencies.json";
import { slugify } from "@/lib/slug";
import { buildSnapshot, pickEmail, pickPostalAddress, SnapshotError, validateSnapshot } from "./snapshot";
import type { Constituency } from "./types";

const contact = (typeId: number, fields: Record<string, string | null>) => ({
  type: typeId === 1 ? "Parliamentary office" : "Constituency office",
  typeId,
  line1: null,
  line2: null,
  line3: null,
  line4: null,
  line5: null,
  postcode: null,
  email: null,
  ...fields,
});

describe("pickEmail", () => {
  it("prefers the parliamentary office and trims stray spaces", () => {
    expect(pickEmail([contact(4, { email: "local@x.uk" }), contact(1, { email: " mp@parliament.uk " })])).toBe(
      "mp@parliament.uk",
    );
  });

  it("falls back to the constituency office", () => {
    expect(pickEmail([contact(1, { email: null }), contact(4, { email: "local@x.uk" })])).toBe("local@x.uk");
  });

  it("returns null rather than constructing an address", () => {
    expect(pickEmail([contact(1, {}), contact(4, { email: "  " })])).toBeNull();
  });
});

describe("pickPostalAddress", () => {
  it("returns the parliamentary office lines and postcode", () => {
    expect(pickPostalAddress([contact(1, { line1: "House of Commons", line2: "London", postcode: "SW1A 0AA" })])).toEqual([
      "House of Commons",
      "London",
      "SW1A 0AA",
    ]);
  });

  it("returns null when there's no parliamentary office address", () => {
    expect(pickPostalAddress([contact(4, { line1: "Constituency office" })])).toBeNull();
    expect(pickPostalAddress([contact(1, { line1: "House of Commons" })])).toBeNull();
  });
});

describe("slugify", () => {
  it.each([
    ["Ynys Môn", "ynys-mon"],
    ["Argyll, Bute and South Lochaber", "argyll-bute-and-south-lochaber"],
    ["Ashton-under-Lyne", "ashton-under-lyne"],
    ["Na h-Eileanan an Iar", "na-h-eileanan-an-iar"],
  ])("%s → %s", (name, slug) => expect(slugify(name)).toBe(slug));
});

describe("buildSnapshot", () => {
  // A fake Members API covering every ONS constituency, with one vacant seat.
  const fakeApi = (url: string) => {
    const u = new URL(url);
    if (u.pathname.endsWith("/Location/Constituency/Search")) {
      const skip = Number(u.searchParams.get("skip"));
      const items = ons.slice(skip, skip + 20).map((o, i) => ({
        value: {
          id: skip + i,
          name: o.name,
          endDate: null,
          currentRepresentation:
            skip + i === 0
              ? null
              : {
                  member: {
                    value: {
                      id: 1000 + skip + i,
                      nameDisplayAs: `MP ${skip + i}`,
                      nameAddressAs: null,
                      latestParty: { name: skip + i === 1 ? "Speaker" : "Independent" },
                      thumbnailUrl: `https://members-api.parliament.uk/api/Members/${1000 + skip + i}/Thumbnail`,
                    },
                  },
                },
        },
      }));
      // Include a historic constituency, which must be filtered out.
      if (skip === 0) {
        const historic = { value: { id: -1, name: "Old Seat", endDate: "2024-05-30T00:00:00", currentRepresentation: null } };
        items.push(historic as unknown as (typeof items)[number]);
      }
      return Promise.resolve({ items, totalResults: ons.length });
    }
    return Promise.resolve({ value: [contact(1, { line1: "House of Commons", postcode: "SW1A 0AA", email: "mp@parliament.uk" })] });
  };

  it("builds 650 records joined to ONS codes", async () => {
    const records = await buildSnapshot({ fetchJson: fakeApi, ons, now: new Date("2026-11-26T04:00:00Z") });
    expect(records).toHaveLength(650);
    const first = records.find((r) => r.name === ons[0].name)!;
    expect(first.onsCode).toBe(ons[0].code);
    expect(first.mp).toBeNull();
    expect(records.find((r) => r.name === ons[1].name)!.mp!.isSpeaker).toBe(true);
    expect(records.every((r) => r.refreshedAt === "2026-11-26T04:00:00.000Z")).toBe(true);
  });

  it("fails instead of writing a partial snapshot", async () => {
    const records = (snapshot as Constituency[]).slice(0, 649);
    expect(() => validateSnapshot(records, ons)).toThrow(SnapshotError);
  });
});

describe("committed snapshot (data/constituencies.json)", () => {
  const records = snapshot as Constituency[];

  it("has all 650 constituencies with unique slugs and ONS codes", () => {
    expect(() => validateSnapshot(records, ons)).not.toThrow();
  });

  it("has 632 constituencies in Great Britain", () => {
    expect(records.filter((r) => r.nation !== "northern-ireland")).toHaveLength(632);
  });

  it("uses the approved House of Commons address for Josh Babarinde", () => {
    expect(records.find((r) => r.name === "Eastbourne")!.mp!.postalAddress).toEqual(["House of Commons", "London", "SW1A 0AA"]);
  });

  it("doesn't invent an email address for Sir Julian Lewis", () => {
    expect(records.find((r) => r.name === "New Forest East")!.mp!.email).toBeNull();
  });

  it("never stores an email address with stray spaces", () => {
    for (const r of records) if (r.mp?.email) expect(r.mp.email).toBe(r.mp.email.trim());
  });
});
