import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveTeam } from "@/lib/auth";
import { rejectNonTeamUser } from "@/lib/reject";

/** Catches non-team sessions that reach a team page (e.g. signed in before this rule). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (claims?.sub) {
    const email = String(claims.email ?? "").toLowerCase();
    const { isTeam } = await resolveTeam(supabase, email, (claims.app_metadata as Record<string, unknown>)?.provider);
    if (isTeam) return NextResponse.redirect(new URL("/team", request.url));
    await rejectNonTeamUser(supabase, claims.sub, email);
  }
  return NextResponse.redirect(new URL("/denied", request.url));
}
