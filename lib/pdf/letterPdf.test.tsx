import { describe, expect, it } from "vitest";
import { buildLetter, letterTokens } from "@/lib/letters";
import { renderLetterPdf } from "./letterPdf";

const sender = { senderName: "Sam Taylor", role: "Owner", businessName: "Taylor's Bakery", businessAddress: "1 High Street\nManchester\nM1 1AE" };
const letter = (personal = "") =>
  buildLetter({
    sectorSlug: "food-and-drink",
    recipient: "minister",
    tokens: letterTokens({ sectorSlug: "food-and-drink", constituency: "Manchester Central", mp: null, sender }),
    personalParagraph: personal,
  });

describe("renderLetterPdf", () => {
  it("renders a full letter with a 1,000-character personal paragraph on one A4 page", async () => {
    const result = await renderLetterPdf(letter("We export cheese to France. ".repeat(36).slice(0, 1000)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.pages).toBe(1);
      expect(Buffer.from(result.pdf.slice(0, 5)).toString()).toBe("%PDF-");
    }
  });

  it("is deterministic: the same letter gives the same bytes", async () => {
    const [a, b] = await Promise.all([renderLetterPdf(letter()), renderLetterPdf(letter())]);
    expect(a.ok && b.ok && a.sha256 === b.sha256).toBe(true);
  });

  it("gives a different hash when the wording changes", async () => {
    const a = await renderLetterPdf(letter());
    const b = await renderLetterPdf(letter().replace("Dear Minister", "Dear Minister Falconer"));
    expect(a.ok && b.ok && a.sha256 !== b.sha256).toBe(true);
  });

  it("refuses a letter that runs onto a second page", async () => {
    const long = Array.from({ length: 60 }, (_, i) => `Short paragraph number ${i}.`).join("\n\n");
    expect(await renderLetterPdf(long)).toMatchObject({ ok: false, reason: "too-long" });
  });

  it("refuses an empty letter", async () => {
    expect(await renderLetterPdf("  \n ")).toEqual({ ok: false, reason: "empty" });
  });
});
