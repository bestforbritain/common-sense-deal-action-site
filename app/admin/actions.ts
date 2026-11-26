"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authConfigured, isAllowedAdmin, requireAdmin, supabaseAuthClient } from "@/lib/admin/auth";
import { approveLetters, rejectLetter } from "@/lib/posted/service";
import { getPostedStore } from "@/lib/posted/store";

// ------------------------------------------------------------ sign in / out

export async function sendMagicLink(_prev: string | null, form: FormData): Promise<string> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  // Same message either way, so the page doesn't reveal who is on the allowlist.
  const message = "If that address is on the staff list, we’ve sent it a sign-in link.";
  if (!authConfigured() || !isAllowedAdmin(email)) return message;
  const origin = (await headers()).get("origin") ?? "";
  const supabase = await supabaseAuthClient();
  await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: `${origin}/admin/auth/callback` } });
  return message;
}

export async function signOut() {
  if (authConfigured()) await (await supabaseAuthClient()).auth.signOut();
  redirect("/admin/login");
}

// ------------------------------------------------------------ letters

export async function approveAction(form: FormData) {
  const admin = await requireAdmin();
  const ids = form.getAll("id").map(String).filter(Boolean);
  if (ids.length) await approveLetters(ids, admin.email);
  revalidatePath("/admin");
}

export async function rejectAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id) await rejectLetter(id, String(form.get("reason") ?? ""), admin.email);
  revalidatePath("/admin");
}

export async function requeueAction(form: FormData) {
  const admin = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const store = getPostedStore();
  if (id && (await store.transition(id, ["failed"], { status: "queued", failureReason: null }))) {
    await store.addAudit({ actor: admin.email, action: "requeue", target: id, details: {} });
  }
  revalidatePath("/admin");
}

// ------------------------------------------------------------ settings

const poundsToPence = (value: FormDataEntryValue | null): number | null => {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
};

const wholeNumber = (value: FormDataEntryValue | null): number | null => {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};

export async function saveSettingsAction(_prev: string | null, form: FormData): Promise<string> {
  const admin = await requireAdmin();
  const store = getPostedStore();
  const before = await store.getSettings();
  const livePosting = form.get("livePosting") === "on";
  if (livePosting && !before.livePosting && form.get("liveConfirm") !== "on") {
    return "To switch on live posting, tick the box confirming you understand it posts real letters and charges the account.";
  }
  const patch = {
    autoSend: form.get("autoSend") === "on",
    livePosting,
    dailyCap: wholeNumber(form.get("dailyCap")),
    totalBudgetPence: poundsToPence(form.get("totalBudget")),
  };
  if (Number.isNaN(patch.dailyCap)) return "The daily cap must be a whole number of letters, or blank for no cap.";
  if (Number.isNaN(patch.totalBudgetPence)) return "The budget cap must be an amount in pounds, or blank for no cap.";
  try {
    const after = await store.saveSettings(patch, admin.email);
    await store.addAudit({ actor: admin.email, action: "settings", target: null, details: { before, after } });
  } catch (error) {
    return error instanceof Error ? error.message : "Saving failed.";
  }
  revalidatePath("/admin/settings");
  return "Settings saved.";
}
