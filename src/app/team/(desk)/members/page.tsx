import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { teamEmailsFromEnv } from "@/lib/team";

export const metadata: Metadata = { title: "Team" };

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("team_members").select("email").order("email");
  const env = teamEmailsFromEnv() ?? [];
  const synced = new Set((rows ?? []).map((r) => r.email as string));

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold">Info Desk team</h1>
      <p className="mt-2 text-sm">
        Google accounts with access to the team desk. The list comes from the <code className="rounded bg-lavender px-1.5 py-0.5 text-xs">TEAM_EMAILS</code>{" "}
        environment variable. To add or remove someone, update it in Vercel and redeploy.
      </p>
      <div className="card mt-6 divide-y divide-line">
        {env.map((email) => (
          <div key={email} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="font-medium text-ink">{email}</span>
            {synced.has(email) ? (
              <span className="text-xs text-emerald-700">active</span>
            ) : (
              <span className="text-xs text-amber-700">syncing…</span>
            )}
          </div>
        ))}
        {!env.length && <p className="p-4 text-sm text-muted">TEAM_EMAILS is empty.</p>}
      </div>
    </div>
  );
}
