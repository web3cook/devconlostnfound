export async function register() {
  // Apply TEAM_EMAILS changes as soon as a new deployment boots.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { syncTeamMembers } = await import("@/lib/team");
    await syncTeamMembers({ force: true }).catch((e) => console.error("[team] startup sync failed:", e));
  }
}
