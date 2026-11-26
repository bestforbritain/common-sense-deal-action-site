import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/mailer", () => ({ sendEmail: vi.fn(async () => {}) }));

import { sendEmail } from "@/lib/mailer";
import { buildLetter, letterTokens } from "@/lib/letters";
import { renderLetterPdf } from "@/lib/pdf/letterPdf";
import type { PostLetterInput, PostLetterResult } from "@/lib/stannp";
import {
  approveLetters,
  confirmLetter,
  expireUnconfirmed,
  mpRecipient,
  previewLetter,
  processQueue,
  rejectLetter,
  submitLetter,
  type PostedInput,
} from "./service";
import { createMemoryStore, type PostedStore } from "./store";

const sender = { senderName: "Sam Taylor", role: "Owner", businessName: "Taylor's Bakery", businessAddress: "1 High Street\nManchester\nM1 1AE" };
const letterText = buildLetter({
  sectorSlug: "retail",
  recipient: "mp",
  tokens: letterTokens({ sectorSlug: "retail", constituency: "Manchester Central", mp: { addressAs: null, displayName: "Lucy Powell" }, sender }),
});

const input = (overrides: Partial<PostedInput> = {}): PostedInput => ({
  constituencySlug: "manchester-central",
  sectorSlug: "retail",
  recipientType: "mp",
  ...sender,
  role: sender.role,
  email: "sam@example.com",
  letterText,
  ...overrides,
});

let sha: string;
let store: PostedStore;
const fakePost = vi.fn(async (i: PostLetterInput): Promise<PostLetterResult> => ({ test: !i.livePostingSetting, stannpId: 0, costPence: 81, pdfUrl: "https://example.test/proof.pdf", status: "test" }));

async function submitted(overrides: Partial<PostedInput> = {}) {
  const result = await submitLetter({ ...input(overrides), previewSha256: sha }, { origin: "http://localhost:3000", store });
  if (!result.ok) throw new Error(result.error);
  const token = (vi.mocked(sendEmail).mock.calls.at(-1)![0].text.match(/confirm\/([\w-]+)/) ?? [])[1];
  return { id: result.letterId, token };
}

beforeEach(async () => {
  vi.clearAllMocks();
  store = createMemoryStore();
  const rendered = await renderLetterPdf(letterText);
  if (!rendered.ok) throw new Error("render failed");
  sha = rendered.sha256;
});

describe("previewLetter", () => {
  it("returns the PDF and its hash", async () => {
    const preview = await previewLetter(input());
    expect(preview.ok && preview.sha256).toBe(sha);
  });

  it("refuses a recipient that isn't available", async () => {
    expect(await previewLetter(input({ constituencySlug: "belfast-north" }))).toEqual({ ok: false, error: "bad-request" });
  });
});

describe("submitLetter", () => {
  it("saves the letter awaiting confirmation and emails a confirmation link", async () => {
    const { id, token } = await submitted();
    const letter = await store.getLetter(id);
    expect(letter).toMatchObject({ status: "awaiting_confirmation", recipientKey: "mp:4263", recipientName: "Lucy Powell MP", pdfSha256: sha });
    expect(letter!.recipientAddress).toMatchObject({ address1: "House of Commons", city: "London", postcode: "SW1A 0AA" });
    expect(token).toBeTruthy();
    // Only a hash of the token is stored.
    expect(letter!.confirmTokenHash).not.toContain(token);
    expect(vi.mocked(sendEmail).mock.calls[0][0].to).toBe("sam@example.com");
  });

  it("refuses if the letter changed since the preview", async () => {
    const result = await submitLetter({ ...input({ letterText: letterText + " Extra." }), previewSha256: sha }, { origin: "", store });
    expect(result).toEqual({ ok: false, error: "preview-changed" });
  });

  it("lists missing fields", async () => {
    const result = await submitLetter({ ...input({ senderName: " ", email: "nope" }), previewSha256: sha }, { origin: "", store });
    expect(result).toEqual({ ok: false, error: "fields", fields: ["senderName", "email"] });
  });

  it("allows one letter per email address per recipient", async () => {
    await submitted();
    const again = await submitLetter({ ...input({ email: "SAM@example.com" }), previewSha256: sha }, { origin: "", store });
    expect(again).toEqual({ ok: false, error: "duplicate" });
    // The Minister is a different recipient.
    const ministerText = letterText.replace("Dear Lucy Powell", "Dear Minister");
    const rendered = await renderLetterPdf(ministerText);
    const toMinister = await submitLetter({ ...input({ recipientType: "minister", letterText: ministerText }), previewSha256: rendered.ok ? rendered.sha256 : "" }, { origin: "", store });
    expect(toMinister.ok).toBe(true);
  });
});

describe("confirmLetter", () => {
  it("moves the letter to awaiting approval, once", async () => {
    const { id, token } = await submitted();
    expect(await confirmLetter(token, { store })).toEqual({ kind: "confirmed", autoSend: false, capDelay: false });
    expect((await store.getLetter(id))!.status).toBe("awaiting_approval");
    expect(await confirmLetter(token, { store })).toEqual({ kind: "already" });
  });

  it("expires after 48 hours", async () => {
    const { id, token } = await submitted();
    expect(await confirmLetter(token, { store, now: new Date(Date.now() + 49 * 3600_000) })).toEqual({ kind: "expired" });
    expect((await store.getLetter(id))!.status).toBe("expired");
  });

  it("rejects unknown tokens", async () => {
    expect(await confirmLetter("not-a-token", { store })).toEqual({ kind: "invalid" });
  });
});

describe("approval and the queue", () => {
  it("approves, then posts in test mode with the stored PDF and our id as the key", async () => {
    const { id, token } = await submitted();
    await confirmLetter(token, { store });
    await store.transition(id, ["awaiting_approval"], { status: "queued", approvedBy: "staff@bestforbritain.org" });
    const result = await processQueue({ store, post: fakePost });
    expect(result).toEqual({ sent: 1, failed: 0, stoppedByCap: false });
    const call = fakePost.mock.calls[0][0];
    expect(call.letterId).toBe(id);
    expect(call.livePostingSetting).toBe(false);
    expect(Buffer.from(call.pdf.slice(0, 5)).toString()).toBe("%PDF-");
    expect(await store.getLetter(id)).toMatchObject({ status: "sent", stannpId: 0, stannpTest: true, stannpCostPence: 81, stannpPdfUrl: "https://example.test/proof.pdf" });
  });

  it("records approvals in the audit log", async () => {
    const { id, token } = await submitted();
    await confirmLetter(token, { store });
    // No Stannp key in tests, so the letter stays queued after approval.
    expect(await approveLetters([id], "staff@bestforbritain.org", store)).toBe(1);
    expect((await store.getLetter(id))!.status).toBe("queued");
    expect((await store.listAudit())[0]).toMatchObject({ actor: "staff@bestforbritain.org", action: "approve", target: id });
  });

  it("stops at the daily cap and leaves the rest queued", async () => {
    await store.saveSettings({ dailyCap: 1 }, "staff");
    const a = await submitted();
    const b = await submitted({ email: "other@example.com" });
    for (const { id, token } of [a, b]) {
      await confirmLetter(token, { store });
      await store.transition(id, ["awaiting_approval"], { status: "queued" });
    }
    expect(await processQueue({ store, post: fakePost })).toEqual({ sent: 1, failed: 0, stoppedByCap: true });
    expect((await store.listLetters({ status: "queued" })).length).toBe(1);
  });

  it("stops when the total budget is spent", async () => {
    await store.saveSettings({ totalBudgetPence: 0 }, "staff");
    const { id, token } = await submitted();
    await confirmLetter(token, { store });
    await store.transition(id, ["awaiting_approval"], { status: "queued" });
    expect(await processQueue({ store, post: fakePost })).toEqual({ sent: 0, failed: 0, stoppedByCap: true });
  });

  it("marks a letter failed when Stannp rejects it", async () => {
    const { id, token } = await submitted();
    await confirmLetter(token, { store });
    await store.transition(id, ["awaiting_approval"], { status: "queued" });
    await processQueue({ store, post: async () => { throw new Error("Invalid address"); } });
    expect(await store.getLetter(id)).toMatchObject({ status: "failed", failureReason: "Invalid address" });
  });

  it("auto-send queues letters straight after confirmation", async () => {
    await store.saveSettings({ totalBudgetPence: 10_000, autoSend: true }, "staff");
    const { id, token } = await submitted();
    expect((await confirmLetter(token, { store })).kind).toBe("confirmed");
    expect((await store.getLetter(id))!.status).toBe("queued");
  });

  it("rejects with an internal reason", async () => {
    const { id, token } = await submitted();
    await confirmLetter(token, { store });
    expect(await rejectLetter(id, "Abusive language", "staff", store)).toBe(true);
    expect(await store.getLetter(id)).toMatchObject({ status: "rejected", rejectionReason: "Abusive language" });
  });

  it("expires unconfirmed letters", async () => {
    const { id } = await submitted();
    expect(await expireUnconfirmed(store, new Date(Date.now() + 49 * 3600_000))).toBe(1);
    expect((await store.getLetter(id))!.status).toBe("expired");
  });
});

describe("settings", () => {
  it("won't switch on auto-send without a total budget cap", async () => {
    await expect(store.saveSettings({ autoSend: true }, "staff")).rejects.toThrow("budget");
  });
});

describe("mpRecipient", () => {
  const mp = { id: 1, displayName: "Sir Julian Lewis", addressAs: null, party: "Conservative", isSpeaker: false, email: null, thumbnailUrl: "" };
  it("splits a parliamentary address into Stannp fields", () => {
    expect(mpRecipient({ ...mp, postalAddress: ["House of Commons", "Westminster", "London", "SW1A 0AA"] })).toMatchObject({
      firstname: "Sir Julian Lewis",
      lastname: "MP",
      address1: "House of Commons",
      address2: "Westminster",
      city: "London",
      postcode: "SW1A 0AA",
    });
  });
  it("returns null without an address", () => {
    expect(mpRecipient({ ...mp, postalAddress: null })).toBeNull();
  });
});
