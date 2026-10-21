export async function register() {
  // Give the SUPERADMIN a team_members row as soon as a deployment boots.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureAllSuperadmins } = await import("@/lib/team");
    await ensureAllSuperadmins().catch((e) => console.error("[team] startup check failed:", e));
  }
}
