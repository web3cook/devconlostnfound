import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTeam } from "@/lib/auth";
import { rejectNonTeamUser } from "@/lib/reject";
import { safeNext } from "@/lib/safe-next";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/team");

  // Behind Vercel's proxy, prefer the forwarded host so we land on the right domain.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = process.env.NODE_ENV !== "development" && forwardedHost ? `https://${forwardedHost}` : origin;

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const email = (data.user.email ?? "").toLowerCase();
      const { isTeam } = await resolveTeam(supabase, email, data.user.app_metadata?.provider);
      if (!isTeam) {
        await rejectNonTeamUser(supabase, data.user.id, email);
        return NextResponse.redirect(`${base}/denied`);
      }
      return NextResponse.redirect(`${base}${next}`);
    }
  }

  return NextResponse.redirect(`${base}/login?error=1&next=${encodeURIComponent(next)}`);
}
