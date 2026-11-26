import { describe, expect, it } from "vitest";
import { flagsFor } from "./moderation";

describe("flagsFor", () => {
  it("flags offensive words as whole words only", () => {
    expect(flagsFor(["This deal is shit."])).toEqual(["language"]);
    expect(flagsFor(["We ship to Scunthorpe and Essex."])).toEqual([]);
  });

  it("flags web addresses", () => {
    expect(flagsFor(["See https://example.com for more"])).toEqual(["link"]);
    expect(flagsFor(["visit cheap-pills.xyz today"])).toEqual(["link"]);
  });

  it("flags long text in capitals", () => {
    expect(flagsFor(["WE HAVE LOST ALL OUR CUSTOMERS IN FRANCE AND NOBODY IN GOVERNMENT CARES. ".repeat(5)])).toEqual(["shouting"]);
    expect(flagsFor(["The EU, UK and SPS agreement matter to our business. ".repeat(5)])).toEqual([]);
  });

  it("returns nothing for an ordinary letter", () => {
    expect(flagsFor(["Dear Minister,", "Our bakery has faced more paperwork since 2021."])).toEqual([]);
  });
});
