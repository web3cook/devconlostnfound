import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { GoogleButton } from "./google-button";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(typeof rawNext === "string" ? rawNext : null, "/my-reports");
  if (await getViewer()) redirect(next);

  return (
    <div className="container-page grid min-h-[70vh] place-items-center py-16">
      <div className="card w-full max-w-md p-8 text-center">
        <p className="eyebrow">Devcon Lost &amp; Found</p>
        <h1 className="mt-2 text-2xl font-extrabold">Sign in to continue</h1>
        <p className="mt-2 text-sm text-muted">
          Sign in with Google to report a lost item and follow its status. Info Desk volunteers use the
          Google account their lead added to the team.
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
          Your contact details are only shared with the Info Desk team, never shown publicly.
        </p>
      </div>
    </div>
  );
}
