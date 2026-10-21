import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Authorisation denied" };

export default function DeniedPage() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-16">
      <div className="card max-w-md p-8 text-center">
        <p className="text-4xl">🔒</p>
        <h1 className="mt-3 text-2xl font-extrabold">Authorisation denied</h1>
        <p className="mt-2 text-sm">
          Sign-in is only for the Info Desk team, and this Google account isn&apos;t on the team. You&apos;ve been signed out.
        </p>
        <p className="mt-4 text-sm">
          Lost something? You don&apos;t need an account. Check the found items, or visit any Info Desk and a team member will
          register it for you.
        </p>
        <div className="mt-6 flex justify-center">
          <Link href="/items" className="btn-primary">Browse found items</Link>
        </div>
      </div>
    </div>
  );
}
