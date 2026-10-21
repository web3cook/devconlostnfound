import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** SUPERADMIN env var: one email (a comma-separated list also works). */
export function superadminEmails(): string[] {
  return (process.env.SUPERADMIN ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_RE.test(e));
}

export function isSuperadminEmail(email: string) {
  return superadminEmails().includes(email.toLowerCase());
}

// email → performance.now() of the last successful check
const ensuredAt = new Map<string, number>();
const RECHECK_MS = 5 * 60_000;

/**
 * Make sure the superadmin has a team_members row, so RLS grants them every
 * team ability. Re-checked every few minutes, in case the row was deleted.
 */
export async function ensureSuperadminMember(email: string) {
  email = email.toLowerCase();
  if (!isSuperadminEmail(email)) return;
  const last = ensuredAt.get(email);
  if (last !== undefined && performance.now() - last < RECHECK_MS) return;
  if (!process.env.SUPABASE_SECRET_KEY) {
    console.warn("[team] SUPABASE_SECRET_KEY is not set; cannot register the superadmin");
    return;
  }
  const { error } = await createAdminClient()
    .from("team_members")
    .upsert({ email, added_by: "SUPERADMIN env" }, { onConflict: "email", ignoreDuplicates: true });
  if (error) return console.error("[team] could not register superadmin:", error.message);
  ensuredAt.set(email, performance.now());
}

export async function ensureAllSuperadmins() {
  await Promise.all(superadminEmails().map(ensureSuperadminMember));
}
