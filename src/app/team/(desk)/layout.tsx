import { Suspense } from "react";
import Link from "next/link";
import { requireTeam } from "@/lib/auth";
import { PageSkeleton } from "@/components/page-skeleton";

const NAV = [
  { href: "/team", label: "Dashboard" },
  { href: "/team/items/new", label: "+ Log found item" },
  { href: "/team/items", label: "Inventory" },
  { href: "/team/reports/new", label: "+ File lost report" },
  { href: "/team/reports", label: "Lost reports" },
  { href: "/team/members", label: "Team" },
];

// Pages only render once the viewer is confirmed as team. RLS enforces the same
// rule in the database, so this is about UX, not the security boundary.
async function TeamGate({ children }: { children: React.ReactNode }) {
  await requireTeam();
  return children;
}

export default function TeamLayout({ children }: LayoutProps<"/team">) {
  return (
    <div>
      <div className="border-b border-line bg-white/70 backdrop-blur">
        <nav className="container-page flex gap-1 overflow-x-auto py-2 text-sm">
          <span className="mr-2 flex shrink-0 items-center gap-1.5 font-semibold text-brand">
            <span className="h-2 w-2 rounded-full bg-mint" /> Team desk
          </span>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded-full px-3 py-1.5 font-medium hover:bg-lavender">
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <Suspense fallback={<PageSkeleton />}>
        <TeamGate>{children}</TeamGate>
      </Suspense>
    </div>
  );
}
