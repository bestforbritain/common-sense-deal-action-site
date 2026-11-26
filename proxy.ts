import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Keeps admin sign-in sessions fresh. Runs on /admin only. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
