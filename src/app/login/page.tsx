import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(typeof rawNext === "string" ? rawNext : null, "/team");
  const viewer = await getViewer();
  if (viewer) redirect(viewer.isTeam ? next : "/auth/denied");

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16">
      <div className="card w-full max-w-md p-8 text-center">
        <p className="eyebrow">Info Desk team</p>
        <h1 className="mt-2 text-2xl font-extrabold">Team login</h1>
        <p className="mt-2 text-sm text-muted">
          For Info Desk team members only. Use the Google account the superadmin added to the team.
        </p>
        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            Sign-in didn&apos;t complete. Please try again.
          </p>
        )}
        <div className="mt-6">
          <GoogleButton next={next} />
        </div>
        <p className="mt-6 text-xs text-muted">
          Lost something? You don&apos;t need to sign in. Visit any Info Desk and a team member will help.
        </p>
      </div>
    </div>
  );
}
