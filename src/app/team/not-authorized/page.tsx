import Link from "next/link";
import { getViewer } from "@/lib/auth";

export default async function NotAuthorized() {
  const viewer = await getViewer();
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16">
      <div className="card max-w-md p-8 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-2xl font-extrabold">Team access only</h1>
        <p className="mt-2 text-sm">
          {viewer ? (
            <>
              <strong>{viewer.email}</strong> isn&apos;t on the Info Desk team list.
            </>
          ) : (
            "You need to sign in with a whitelisted Google account."
          )}{" "}
          Ask the Lost &amp; Found lead to add your Google account.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/items" className="btn-secondary">Browse found items</Link>
          {viewer && (
            <form action="/auth/signout" method="post">
              <button className="btn-ghost">Switch account</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
