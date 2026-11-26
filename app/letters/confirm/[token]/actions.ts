"use server";

import { confirmLetter, type ConfirmResult } from "@/lib/posted/service";

export async function confirmAction(token: string): Promise<ConfirmResult> {
  if (typeof token !== "string" || token.length > 100) return { kind: "invalid" };
  return confirmLetter(token);
}
