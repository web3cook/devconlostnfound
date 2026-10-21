import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Whitelisted Info Desk team, from TEAM_EMAILS (comma, space or newline
 * separated). Returns null when the variable is unset so we never wipe the
 * roster because of a missing env var.
 */
export function teamEmailsFromEnv(): string[] | null {
  const raw = process.env.TEAM_EMAILS;
  if (raw === undefined) return null;
  return [...new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => EMAIL.test(e)))];
}

export function isTeamEmail(email: string) {
  return teamEmailsFromEnv()?.includes(email.toLowerCase()) ?? false;
}

let lastSync = -Infinity;
let inflight: Promise<void> | null = null;

/**
 * Mirror TEAM_EMAILS into public.team_members, which RLS reads. Throttled per
 * server instance; pass force to sync regardless (server start, sign-in).
 */
export function syncTeamMembers({ force = false } = {}): Promise<void> {
  if (!force && performance.now() - lastSync < 30_000) return Promise.resolve();
  inflight ??= doSync().finally(() => {
    inflight = null;
  });
  return inflight;
}

async function doSync() {
  const desired = teamEmailsFromEnv();
  if (desired === null) {
    console.warn("[team] TEAM_EMAILS is not set; leaving team_members unchanged");
    return;
  }
  if (!process.env.SUPABASE_SECRET_KEY) {
    console.warn("[team] SUPABASE_SECRET_KEY is not set; cannot sync team_members");
    return;
  }

  const db = createAdminClient();
  const { data, error } = await db.from("team_members").select("email");
  if (error) {
    console.error("[team] could not read team_members:", error.message);
    return;
  }

  const current = new Set(data.map((r) => r.email as string));
  const want = new Set(desired);
  const toAdd = desired.filter((e) => !current.has(e));
  const toRemove = [...current].filter((e) => !want.has(e));

  if (toAdd.length) {
    const { error } = await db.from("team_members").upsert(toAdd.map((email) => ({ email })));
    if (error) return console.error("[team] add failed:", error.message);
  }
  if (toRemove.length) {
    const { error } = await db.from("team_members").delete().in("email", toRemove);
    if (error) return console.error("[team] remove failed:", error.message);
  }
  if (toAdd.length || toRemove.length) {
    console.info(`[team] synced: +${toAdd.length} −${toRemove.length} (${desired.length} total)`);
  }
  lastSync = performance.now();
}
