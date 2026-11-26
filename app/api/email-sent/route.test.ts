import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/records", () => ({
  recordEmailSent: vi.fn(async () => {}),
  recordMarketingOptIn: vi.fn(async () => {}),
}));

import { recordEmailSent, recordMarketingOptIn } from "@/lib/records";
import { POST } from "./route";

let ip = 0;
const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/email-sent", {
      method: "POST",
      // A fresh IP per request so the rate limiter doesn't interfere.
      headers: { "content-type": "application/json", "x-forwarded-for": `198.51.100.${++ip}` },
      body: JSON.stringify(body),
    }),
  );

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/email-sent", () => {
  it("records sector and constituency only", async () => {
    const res = await post({ constituencySlug: "manchester-central", sectorSlug: "retail", email: "sam@example.com" });
    expect(res.status).toBe(200);
    expect(recordEmailSent).toHaveBeenCalledWith({ onsCode: "E14001352", sector: "retail" });
    // No opt-in ticked: the email address is not stored.
    expect(recordMarketingOptIn).not.toHaveBeenCalled();
  });

  it("stores an opt-in with the server's wording and version", async () => {
    const res = await post({ constituencySlug: "manchester-central", sectorSlug: "retail", optIn: true, email: " sam@example.com " });
    expect(res.status).toBe(200);
    expect(recordMarketingOptIn).toHaveBeenCalledWith(
      expect.objectContaining({ email: "sam@example.com", source: "email-mp", wordingVersion: expect.any(String), wording: expect.any(String) }),
    );
  });

  it("rejects an opt-in without a valid email address", async () => {
    expect((await post({ constituencySlug: "manchester-central", sectorSlug: "retail", optIn: true, email: "nope" })).status).toBe(400);
    expect(recordEmailSent).not.toHaveBeenCalled();
  });

  it.each([
    [{ constituencySlug: "manchester-central", sectorSlug: "not-a-sector" }],
    [{ constituencySlug: "nowhere", sectorSlug: "retail" }],
    [{ constituencySlug: "belfast-north", sectorSlug: "retail" }],
  ])("rejects bad or out-of-scope input %j", async (body) => {
    expect((await post(body)).status).toBe(400);
  });

  it("refuses submissions in production when Turnstile isn't configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await post({ constituencySlug: "manchester-central", sectorSlug: "retail" })).status).toBe(403);
    spy.mockRestore();
  });
});
