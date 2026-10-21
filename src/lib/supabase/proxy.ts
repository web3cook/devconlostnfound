import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { resolveTeam } from "@/lib/auth";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Refreshes the auth token if needed. Don't run code between createServerClient
  // and getClaims(), or users may be signed out at random.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  // Early redirects for UX; pages, server actions and RLS still enforce access.
  const { pathname, search } = request.nextUrl;
  const needsAuth = ["/team"].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  let target: string | null = null;
  if (needsAuth && !signedIn) {
    target = `/login?next=${encodeURIComponent(pathname + search)}`;
  } else if (needsAuth) {
    // Signed in but not on the team: /auth/denied signs them out and deletes the
    // account. Checked here so it's a real redirect before any page streams.
    const claims = data!.claims;
    const email = String(claims.email ?? "").toLowerCase();
    const { isTeam } = await resolveTeam(supabase, email, (claims.app_metadata as Record<string, unknown>)?.provider);
    if (!isTeam) target = "/auth/denied";
  }

  if (target) {
    const redirect = NextResponse.redirect(new URL(target, request.url));
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    for (const header of ["cache-control", "expires", "pragma"]) {
      const value = supabaseResponse.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  return supabaseResponse;
}
