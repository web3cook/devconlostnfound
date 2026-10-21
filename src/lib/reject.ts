import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Only the Info Desk team uses accounts on this site. Anyone else who signs in
 * is signed out and their Supabase Auth user is deleted. Callers must have
 * already checked that the user is NOT on the team.
 */
export async function rejectNonTeamUser(supabase: SupabaseClient, userId: string, email: string) {
  // Revoke the session first; deleting a user doesn't invalidate issued tokens.
  await supabase.auth.signOut({ scope: "global" });
  const { error } = await createAdminClient().auth.admin.deleteUser(userId);
  if (error) console.error(`[auth] could not delete non-team user ${email}:`, error.message);
  else console.info(`[auth] rejected non-team sign-in: ${email}`);
}
