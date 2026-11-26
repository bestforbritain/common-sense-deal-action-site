import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lettersBySector } from "@/content/letters";
import { sectors } from "@/content/sectors";
import { buildLetter, buildSubject, letterTokens, salutationName } from "./letters";

const source = readFileSync(new URL("../inputs/letters.md", import.meta.url), "utf8");

const sender = {
  senderName: "Sam Taylor",
  role: "Owner",
  businessName: "Taylor's Bakery",
  businessAddress: "1 High Street\nManchester\nM1 1AE",
};

const tokens = (sectorSlug: string) =>
  letterTokens({ sectorSlug, constituency: "Manchester Central", mp: { addressAs: null, displayName: "Lucy Powell" }, sender });

describe("letter content matches inputs/letters.md word for word", () => {
  it("has a letter for every sector", () => {
    expect(Object.keys(lettersBySector).sort()).toEqual(sectors.map((s) => s.slug).sort());
  });

  it.each(sectors.map((s) => [s.name, s.slug]))("%s: sector paragraph and noun", (name, slug) => {
    const letters = lettersBySector[slug];
    const section = source.split(`### ${name}\n`)[1].split("\n### ")[0].split("\n## ")[0];
    expect(section).toContain(`{sectorNoun}: ${letters.sectorNoun}\n`);
    expect(section).toContain(letters.mp.sectorParagraph);
    expect(letters.minister.sectorParagraph).toBe(letters.mp.sectorParagraph);
  });

  it("uses the shared openings, asks and sign-off verbatim", () => {
    const { mp, minister } = lettersBySector.retail;
    for (const p of [...mp.opening, ...minister.opening, ...mp.ask, ...minister.ask, ...mp.signOff]) {
      expect(source).toContain(p);
    }
  });
});

describe("buildLetter", () => {
  it("assembles opening, sector paragraph, ask and sign-off in order", () => {
    const letter = buildLetter({ sectorSlug: "retail", recipient: "mp", tokens: tokens("retail") });
    expect(letter.startsWith("Dear Lucy Powell,\n\nI am writing to you as Owner of Taylor's Bakery, a retail business in Manchester Central,")).toBe(true);
    expect(letter.indexOf("Retailers have faced")).toBeLessThan(letter.indexOf("Independent modelling"));
    expect(letter.endsWith("Yours sincerely,\n\nSam Taylor\nOwner, Taylor's Bakery\n1 High Street\nManchester\nM1 1AE")).toBe(true);
    expect(letter).not.toMatch(/\{\w+\}/);
  });

  it("puts the personal paragraph between the sector paragraph and the ask", () => {
    const letter = buildLetter({ sectorSlug: "retail", recipient: "mp", tokens: tokens("retail"), personalParagraph: "  We lost two EU customers.  " });
    const sectorEnd = letter.indexOf("more choice.") + "more choice.".length;
    expect(letter.slice(sectorEnd, sectorEnd + 33)).toBe("\n\nWe lost two EU customers.\n\nInde");
  });

  it("caps the personal paragraph at 1,000 characters", () => {
    const letter = buildLetter({ sectorSlug: "other", recipient: "mp", tokens: tokens("other"), personalParagraph: "x".repeat(1200) });
    expect(letter).toContain("x".repeat(1000) + "\n\n");
    expect(letter).not.toContain("x".repeat(1001));
  });

  it("opens the Minister version with Dear Minister", () => {
    expect(buildLetter({ sectorSlug: "retail", recipient: "minister", tokens: tokens("retail") }).startsWith("Dear Minister,\n\n")).toBe(true);
  });

  it("says 'a business in the creative industry' for arts, culture and events", () => {
    const letter = buildLetter({ sectorSlug: "arts-culture-events", recipient: "mp", tokens: tokens("arts-culture-events") });
    expect(letter).toContain("of Taylor's Bakery, a business in the creative industry in Manchester Central, to ask you");
    expect(letter).not.toContain("a arts");
  });

  it("shows placeholders for details not yet filled in", () => {
    const empty = letterTokens({
      sectorSlug: "retail",
      constituency: "Manchester Central",
      mp: { addressAs: null, displayName: "Lucy Powell" },
      sender: { senderName: "", role: " ", businessName: "", businessAddress: "" },
    });
    const letter = buildLetter({ sectorSlug: "retail", recipient: "mp", tokens: empty });
    expect(letter).toContain("as [your role] of [your business name], a retail business");
    expect(letter.endsWith("[your name]\n[your role], [your business name]\n[your business address]")).toBe(true);
  });
});

describe("salutationName", () => {
  it("prefers Parliament's address-as name", () => {
    expect(salutationName({ addressAs: "Sir Lindsay", displayName: "Sir Lindsay Hoyle" })).toBe("Sir Lindsay");
  });
  it("falls back to the display name", () => {
    expect(salutationName({ addressAs: null, displayName: "Lucy Powell" })).toBe("Lucy Powell");
  });
});

describe("buildSubject", () => {
  it("fills in the constituency", () => {
    expect(buildSubject(tokens("retail"))).toBe("A Manchester Central business asking you to back EU membership");
  });
});
