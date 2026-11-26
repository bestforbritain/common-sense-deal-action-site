import { describe, expect, it } from "vitest";
import { runRetention } from "./retention";
import { createMemoryStore } from "./store";
import type { NewLetter } from "./types";

const base: NewLetter = {
  recipientType: "minister",
  recipientKey: "minister",
  recipientName: "The Minister",
  recipientAddress: { firstname: "Minister", address1: "70 Whitehall", city: "London", postcode: "SW1A 2AS", country: "GB" },
  onsCode: "E14001352",
  constituencyName: "Manchester Central",
  sector: "retail",
  senderName: "Sam Taylor",
  senderRole: "Owner",
  businessName: "Taylor's Bakery",
  businessAddress: "1 High Street",
  email: "sam@example.com",
  letterText: "Dear Minister",
  pdfSha256: "abc",
  flags: [],
  confirmTokenHash: "t1",
  confirmExpiresAt: new Date().toISOString(),
};

describe("runRetention", () => {
  it("does nothing until a retention period is set", async () => {
    expect(await runRetention(createMemoryStore(), { days: null })).toEqual({ skipped: true });
  });

  it("removes personal data from old finished letters and keeps the counts", async () => {
    const store = createMemoryStore();
    const done = await store.insertLetter(base, new Uint8Array([1]));
    await store.transition(done.id, ["awaiting_confirmation"], { status: "sent" });
    const pending = await store.insertLetter({ ...base, email: "b@example.com", confirmTokenHash: "t2" }, new Uint8Array([2]));
    await store.transition(pending.id, ["awaiting_confirmation"], { status: "awaiting_approval" });

    const result = await runRetention(store, { days: 30, now: new Date(Date.now() + 31 * 86_400_000) });
    expect(result).toMatchObject({ skipped: false, anonymised: 1 });

    const after = (await store.getLetter(done.id))!;
    expect(after).toMatchObject({ senderName: "", businessAddress: "", email: null, letterText: null, sector: "retail", onsCode: "E14001352", status: "sent" });
    expect(after.anonymisedAt).not.toBeNull();
    await expect(store.getPdf(after)).rejects.toThrow();
    // A letter still waiting for approval is untouched.
    expect((await store.getLetter(pending.id))!.email).toBe("b@example.com");
    expect((await store.listAudit())[0]).toMatchObject({ actor: "retention-job", action: "anonymise" });
  });
});
