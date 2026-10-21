import { cache } from "react";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ensureSuperadminMember, isSuperadminEmail } from "@/lib/team";

export type Viewer = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  /** On the Info Desk team: listed in team_members and signed in with Google. */
  isTeam: boolean;
  /** Matches the SUPERADMIN env var: can add and remove team members. */
  isSuperadmin: boolean;
};

/**
 * Team membership for a verified identity. Mirrors private.is_team(): a row in
 * team_members (or the SUPERADMIN env var) AND a Google sign-in.
 */
export async function resolveTeam(supabase: SupabaseClient, email: string, provider: unknown) {
  const isGoogle = provider === "google" && Boolean(email);
  const isSuperadmin = isGoogle && isSuperadminEmail(email);
  if (isSuperadmin) {
    await ensureSuperadminMember(email);
    return { isTeam: true, isSuperadmin };
  }
  if (!isGoogle) return { isTeam: false, isSuperadmin };
  // RLS returns this row to its owner (or to the team).
  const { data: row, error } = await supabase.from("team_members").select("email").eq("email", email).maybeSingle();
  if (error) throw new Error(`Could not check team membership: ${error.message}`);
  return { isTeam: Boolean(row), isSuperadmin };
}

/** The signed-in user, from a verified token. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const email = String(claims.email ?? "").toLowerCase();
  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  // Mirrors private.is_team() in the database: provider comes from
  // app_metadata, which users can't edit.
  const provider = (claims.app_metadata as Record<string, unknown> | undefined)?.provider;
  const { isTeam, isSuperadmin } = await resolveTeam(supabase, email, provider);

  return {
    id: claims.sub,
    email,
    name: (meta.full_name as string) ?? (meta.name as string) ?? null,
    avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    isTeam,
    isSuperadmin,
  };
});

export async function requireViewer(next: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function requireTeam(next = "/team") {
  const viewer = await requireViewer(next);
  // Signed in but not on the team: /auth/denied signs them out and deletes the account.
  if (!viewer.isTeam) redirect("/auth/denied");
  return viewer;
}

export async function requireSuperadmin() {
  const viewer = await requireTeam("/team/members");
  if (!viewer.isSuperadmin) redirect("/team/members");
  return viewer;
}
