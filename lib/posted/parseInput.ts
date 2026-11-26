import type { PostedInput } from "./service";

const MAX_FIELD = 500;
const MAX_LETTER = 6000;

/** Reads and bounds a PostedInput from a request body. Returns null if malformed. */
export function parsePostedInput(body: unknown): PostedInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const str = (key: string, max = MAX_FIELD) => (typeof b[key] === "string" && (b[key] as string).length <= max ? (b[key] as string) : null);
  const recipientType = b.recipientType === "mp" || b.recipientType === "minister" ? b.recipientType : null;
  const values = {
    constituencySlug: str("constituencySlug", 100),
    sectorSlug: str("sectorSlug", 100),
    senderName: str("senderName"),
    role: str("role"),
    businessName: str("businessName"),
    businessAddress: str("businessAddress"),
    email: str("email", 254),
    letterText: str("letterText", MAX_LETTER),
  };
  if (!recipientType || Object.values(values).some((v) => v === null)) return null;
  return { ...(values as Record<keyof typeof values, string>), recipientType };
}
