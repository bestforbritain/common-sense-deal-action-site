import { describe, expect, it, vi } from "vitest";
import { buildLetterForm, isLivePosting, postLetter, type PostLetterInput, type PostingEnv } from "./stannp";

const input = (livePostingSetting: boolean): PostLetterInput => ({
  letterId: "11111111-2222-3333-4444-555555555555",
  pdf: new Uint8Array([37, 80, 68, 70]),
  recipient: { firstname: "The Rt Hon Hamish Falconer MP", company: "Cabinet Office", address1: "70 Whitehall", city: "London", postcode: "SW1A 2AS", country: "GB" },
  livePostingSetting,
});

const okResponse = () =>
  new Response(JSON.stringify({ success: true, data: { id: 0, cost: "0.81", pdf: "https://example.test/sample.pdf", status: "test" } }), { status: 200 });

async function sentTestFlag(env: PostingEnv, setting: boolean): Promise<string | null> {
  const fetchMock = vi.fn(async () => okResponse());
  await postLetter(input(setting), { fetch: fetchMock as unknown as typeof fetch, env, apiKey: "test-key" });
  const init = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1];
  return (init.body as FormData).get("test") as string | null;
}

// Every combination of the three conditions.
const stannpLive = [undefined, "", "false", "TRUE", "1", "yes", "true"];
const vercelEnv = [undefined, "development", "preview", "production"];
const settings = [false, true];

describe("postLetter safety rule", () => {
  const combos = stannpLive.flatMap((s) => vercelEnv.flatMap((v) => settings.map((l) => ({ s, v, l }))));

  it.each(combos.filter((c) => !(c.s === "true" && c.v === "production" && c.l)))(
    "sends test=true when STANNP_LIVE=$s, VERCEL_ENV=$v, live posting setting=$l",
    async ({ s, v, l }) => {
      expect(await sentTestFlag({ STANNP_LIVE: s, VERCEL_ENV: v }, l)).toBe("true");
    },
  );

  it("sends test=false only when STANNP_LIVE is true, the setting is on, and it's the live deployment", async () => {
    expect(await sentTestFlag({ STANNP_LIVE: "true", VERCEL_ENV: "production" }, true)).toBe("false");
  });

  it("never leaves the test parameter out", () => {
    for (const live of [true, false]) expect(buildLetterForm(input(false), live).has("test")).toBe(true);
  });

  it("only isLivePosting decides, and it needs all three conditions", () => {
    expect(isLivePosting({ STANNP_LIVE: "true", VERCEL_ENV: "production" }, true)).toBe(true);
    expect(isLivePosting({ STANNP_LIVE: "true", VERCEL_ENV: "preview" }, true)).toBe(false);
    expect(isLivePosting({ STANNP_LIVE: "true", VERCEL_ENV: "production" }, false)).toBe(false);
    expect(isLivePosting({ STANNP_LIVE: "false", VERCEL_ENV: "production" }, true)).toBe(false);
  });
});

describe("postLetter request", () => {
  it("uses the UK host, basic auth, and our letter id as the idempotency key", async () => {
    const fetchMock = vi.fn(async () => okResponse());
    const result = await postLetter(input(false), { fetch: fetchMock as unknown as typeof fetch, env: {}, apiKey: "abc" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(url).toBe("https://api-eu1.stannp.com/v1/letters/create");
    expect(headers.authorization).toBe(`Basic ${Buffer.from("abc:").toString("base64")}`);
    expect(headers["x-idempotency-key"]).toBe("11111111-2222-3333-4444-555555555555");
    const form = init.body as FormData;
    expect(form.get("duplex")).toBe("false");
    expect(form.get("post_unverified")).toBe("false");
    expect(form.get("recipient[postcode]")).toBe("SW1A 2AS");
    expect(result).toEqual({ test: true, stannpId: 0, costPence: 81, pdfUrl: "https://example.test/sample.pdf", status: "test" });
  });

  it("treats Stannp's 409 repeat response as the original success", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: true, data: { id: 123, cost: 0.81 } }), { status: 409 }));
    const result = await postLetter(input(false), { fetch: fetchMock as unknown as typeof fetch, env: {}, apiKey: "abc" });
    expect(result.stannpId).toBe(123);
  });

  it("throws when Stannp rejects the letter", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ success: false, error: "Invalid address" }), { status: 400 }));
    await expect(postLetter(input(false), { fetch: fetchMock as unknown as typeof fetch, env: {}, apiKey: "abc" })).rejects.toThrow("Invalid address");
  });

  it("refuses to run without an API key", async () => {
    await expect(postLetter(input(false), { env: {}, apiKey: "" })).rejects.toThrow("STANNP_API_KEY");
  });
});
