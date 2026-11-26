/** Browser-side helpers for the postcode lookup. */
import { copy, fill } from "@/content/copy";
import type { LookupResult } from "@/lib/lookup";

export type ClientLookupResult = LookupResult | { kind: "rate-limited" };

export async function requestLookup(postcode: string): Promise<ClientLookupResult> {
  try {
    const res = await fetch("/api/lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postcode }),
    });
    return (await res.json()) as ClientLookupResult;
  } catch {
    return { kind: "unavailable" };
  }
}

/**
 * The message to show for a failed lookup, and whether it belongs to the postcode
 * field (the person can fix it) or to the form as a whole (try again later).
 */
export function lookupErrorMessage(result: ClientLookupResult): { field: boolean; message: string } | null {
  switch (result.kind) {
    case "ok":
      return null;
    case "invalid-format":
      return { field: true, message: copy.home.form.errors.postcodeFormat };
    case "not-recognised":
      return { field: true, message: copy.lookup.notRecognised };
    case "retired":
      return { field: true, message: fill(copy.lookup.retired, { year: result.year }) };
    case "not-covered":
      return { field: true, message: copy.lookup.notCovered };
    case "rate-limited":
      return { field: false, message: copy.lookup.rateLimited };
    case "unavailable":
      return { field: false, message: copy.lookup.unavailable };
  }
}

/*
 * The verified business postcode is kept in sessionStorage so it survives the move
 * from the home page to the action page without ever going in a URL. Storage can be
 * unavailable (private browsing, blocked storage), so every access is guarded and the
 * action page simply asks for the postcode again.
 */
const STORAGE_KEY = "csd:verified-postcode";

export type VerifiedPostcode = { postcode: string; constituencySlug: string };

// In-memory copy, so the page still works within a visit when storage is blocked.
let memoryCopy: string | null = null;
const listeners = new Set<() => void>();

function write(raw: string | null): void {
  memoryCopy = raw;
  try {
    if (raw === null) sessionStorage.removeItem(STORAGE_KEY);
    else sessionStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // Storage unavailable: the in-memory copy is enough for this page.
  }
  listeners.forEach((l) => l());
}

export function saveVerifiedPostcode(value: VerifiedPostcode): void {
  write(JSON.stringify(value));
}

export function clearVerifiedPostcode(): void {
  write(null);
}

/** Raw stored value; a string, so it is stable for useSyncExternalStore. */
export function readVerifiedPostcodeRaw(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? memoryCopy;
  } catch {
    return memoryCopy;
  }
}

export function subscribeVerifiedPostcode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function parseVerifiedPostcode(raw: string | null | undefined): VerifiedPostcode | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<VerifiedPostcode>;
    return typeof parsed.postcode === "string" && typeof parsed.constituencySlug === "string"
      ? { postcode: parsed.postcode, constituencySlug: parsed.constituencySlug }
      : null;
  } catch {
    return null;
  }
}
