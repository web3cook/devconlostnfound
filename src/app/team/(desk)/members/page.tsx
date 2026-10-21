import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { isSuperadminEmail } from "@/lib/team";
import { removeTeamMember } from "@/app/team/actions";
import { AddMemberForm } from "./add-member-form";

export const metadata: Metadata = { title: "Team" };

type Member = { email: string; added_by: string | null; created_at: string };

export default async function MembersPage() {
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("team_members")
    .select("email, added_by, created_at")
    .order("created_at")
    .returns<Member[]>();

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold">Info Desk team</h1>
      <p className="mt-2 text-sm">
        Google accounts with access to the team desk.{" "}
        {viewer?.isSuperadmin
          ? "As superadmin you can add and remove members. Changes apply immediately."
          : "Ask the superadmin to add or remove members."}
      </p>

      {viewer?.isSuperadmin && (
        <div className="mt-6">
          <AddMemberForm />
        </div>
      )}

      <div className="card mt-6 divide-y divide-line">
        {members?.map((m) => {
          const superadmin = isSuperadminEmail(m.email);
          return (
            <div key={m.email} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">
                  {m.email}
                  {superadmin && (
                    <span className="ml-2 rounded-full bg-lavender px-2 py-0.5 text-xs font-semibold text-brand">superadmin</span>
                  )}
                  {m.email === viewer?.email && <span className="ml-2 text-xs text-muted">(you)</span>}
                </p>
                <p className="text-xs text-muted">
                  Added {formatDateTime(m.created_at)}
                  {m.added_by && <> by {m.added_by}</>}
                </p>
              </div>
              {viewer?.isSuperadmin && !superadmin && (
                <form action={removeTeamMember}>
                  <input type="hidden" name="email" value={m.email} />
                  <button className="btn-ghost btn-sm text-red-600">Remove</button>
                </form>
              )}
            </div>
          );
        })}
        {!members?.length && <p className="p-4 text-sm text-muted">No team members yet.</p>}
      </div>
    </div>
  );
}
