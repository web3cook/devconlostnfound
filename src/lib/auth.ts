import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTeamEmail, syncTeamMembers } from "@/lib/team";

export type Viewer = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  /** On the Info Desk team: TEAM_EMAILS lists them and they used Google. */
  isTeam: boolean;
};

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

  return {
    id: claims.sub,
    email,
    name: (meta.full_name as string) ?? (meta.name as string) ?? null,
    avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    isTeam: provider === "google" && Boolean(email) && isTeamEmail(email),
  };
});

export async function requireViewer(next: string) {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(next)}`);
  return viewer;
}

export async function requireTeam(next = "/team") {
  const viewer = await requireViewer(next);
  if (!viewer.isTeam) redirect("/team/not-authorized");
  // Make sure the DB copy that RLS reads is current before team actions run.
  await syncTeamMembers();
  return viewer;
}
