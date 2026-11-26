import { NextResponse } from "next/server";
import { authConfigured, supabaseAuthClient } from "@/lib/admin/auth";

/** Magic-link landing: swaps the one-time code for a session cookie. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (authConfigured() && code) {
    await (await supabaseAuthClient()).auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL("/admin", url.origin));
}
