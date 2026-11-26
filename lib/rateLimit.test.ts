import { describe, expect, it } from "vitest";
import { clientIp, hitInMemory, rateLimitKey, type RateLimitRule } from "./rateLimit";

const rule: RateLimitRule = { route: "test", windowSeconds: 60, max: 3 };

describe("hitInMemory", () => {
  it("allows up to the limit in a window, then blocks", () => {
    const now = Date.UTC(2026, 10, 26, 12, 0, 0);
    const key = "k1";
    expect([1, 2, 3, 4].map(() => hitInMemory(key, rule, now))).toEqual([true, true, true, false]);
  });

  it("starts again in the next window", () => {
    const now = Date.UTC(2026, 10, 26, 12, 0, 0);
    for (let i = 0; i < 4; i++) hitInMemory("k2", rule, now);
    expect(hitInMemory("k2", rule, now + 60_000)).toBe(true);
  });
});

describe("rateLimitKey", () => {
  it("hashes the IP so it's never stored as-is", () => {
    const key = rateLimitKey(rule, "203.0.113.7");
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain("203.0.113.7");
  });
});

describe("clientIp", () => {
  it("uses the first x-forwarded-for address", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });
});
