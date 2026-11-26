import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn(async () => {}) }));

import { sendEmail } from "@/lib/mailer";
import { createMemoryStore, type PostedStore } from "./store";
import type { NewLetter } from "./types";
import { handleStannpWebhook, verifyStannpSignature } from "./webhooks";

const newLetter: NewLetter = {
  recipientType: "minister",
  recipientKey: "minister",
  recipientName: "The Rt Hon Hamish Falconer MP",
  recipientAddress: { firstname: "The Rt Hon Hamish Falconer MP", address1: "70 Whitehall", city: "London", postcode: "SW1A 2AS", country: "GB" },
  onsCode: "E14001352",
  constituencyName: "Manchester Central",
  sector: "retail",
  senderName: "Sam Taylor",
  senderRole: "Owner",
  businessName: "Taylor's Bakery",
  businessAddress: "M1 1AE",
  email: "sam@example.com",
  letterText: "Dear Minister",
  pdfSha256: "abc",
  flags: [],
  confirmTokenHash: "hash",
  confirmExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
};

let store: PostedStore;
let id: string;

beforeEach(async () => {
  vi.clearAllMocks();
  store = createMemoryStore();
  id = (await store.insertLetter(newLetter, new Uint8Array([1]))).id;
  await store.transition(id, ["awaiting_confirmation"], { status: "sent", stannpId: 98765, stannpTest: false });
});

const piece = (status: string, webhook_id = Math.random().toString()) => ({ webhook_id, event: "mailpiece_status", mailpieces: [{ id: 98765, status }] });

describe("verifyStannpSignature", () => {
  const body = '{"event":"test_url"}';
  const digest = createHmac("sha256", "secret").update(body).digest();
  it("accepts hex or base64 HMAC-SHA256 of the raw body", () => {
    expect(verifyStannpSignature(body, digest.toString("hex"), "secret")).toBe(true);
    expect(verifyStannpSignature(body, digest.toString("base64"), "secret")).toBe(true);
  });
  it("rejects a wrong or missing signature, or a changed body", () => {
    expect(verifyStannpSignature(body, "nope", "secret")).toBe(false);
    expect(verifyStannpSignature(body, null, "secret")).toBe(false);
    expect(verifyStannpSignature(body + " ", digest.toString("hex"), "secret")).toBe(false);
    expect(verifyStannpSignature(body, digest.toString("hex"), "other")).toBe(false);
  });
});

describe("handleStannpWebhook", () => {
  it("marks a letter dispatched and emails the sender", async () => {
    expect(await handleStannpWebhook(piece("dispatched"), store)).toMatchObject({ updated: 1 });
    expect((await store.getLetter(id))!.status).toBe("dispatched");
    expect(vi.mocked(sendEmail).mock.calls[0][0]).toMatchObject({ to: "sam@example.com", subject: expect.stringContaining("posted") });
  });

  it("marks a letter returned", async () => {
    await handleStannpWebhook(piece("returned"), store);
    expect((await store.getLetter(id))!.status).toBe("returned");
  });

  it("records printing without changing the status", async () => {
    await handleStannpWebhook(piece("printing"), store);
    expect(await store.getLetter(id)).toMatchObject({ status: "sent", stannpStatus: "printing" });
  });

  it("processes each webhook_id once", async () => {
    await handleStannpWebhook(piece("dispatched", "w1"), store);
    expect(await handleStannpWebhook(piece("returned", "w1"), store)).toMatchObject({ duplicate: true });
    expect((await store.getLetter(id))!.status).toBe("dispatched");
  });

  it("ignores unknown mailpieces and the test event", async () => {
    expect(await handleStannpWebhook({ webhook_id: "x", event: "mailpiece_status", mailpieces: [{ id: 1, status: "dispatched" }] }, store)).toMatchObject({ unknown: 1 });
    expect(await handleStannpWebhook({ event: "test_url" }, store)).toEqual({ duplicate: false, updated: 0, unknown: 0 });
  });
});
