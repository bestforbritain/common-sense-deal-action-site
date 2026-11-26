import { describe, expect, it } from "vitest";
import { formatPostcode, isPostcodeFormat } from "./postcode";

describe("formatPostcode", () => {
  it.each([
    ["sw1a1aa", "SW1A 1AA"],
    ["  m1 1ae ", "M1 1AE"],
    ["EC1A-1BB", "EC1A 1BB"],
    ["b338th", "B33 8TH"],
    ["cr2 6xh", "CR2 6XH"],
  ])("formats %s as %s", (input, expected) => {
    expect(formatPostcode(input)).toBe(expected);
  });

  it("leaves input that isn't a postcode alone, apart from trimming and case", () => {
    expect(formatPostcode(" sw1a ")).toBe("SW1A");
    expect(formatPostcode("hello")).toBe("HELLO");
  });
});

describe("isPostcodeFormat", () => {
  it.each(["SW1A 1AA", "m11ae", "W1A 0AX", "DN55 1PT"])("accepts %s", (p) => {
    expect(isPostcodeFormat(p)).toBe(true);
  });

  it.each(["", "SW1A", "12345", "SW1A 1A", "QQ1 1QQQ"])("rejects %s", (p) => {
    expect(isPostcodeFormat(p)).toBe(false);
  });
});
