import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { topMatches } from "@/lib/match";
import { formatDateTime, itemRef, reportRef, timeAgo } from "@/lib/format";
import type { LostReport } from "@/lib/types";
import { loadTeamItems, toMatchable } from "@/lib/team-items";
import { CategoryTag } from "@/components/badges";

export const metadata: Metadata = { title: "Team desk" };

export default async function TeamDashboard() {
  const supabase = await createClient();
  const [items, { data: reports }, { count: claimed }, { count: matched }] = await Promise.all([
    loadTeamItems(supabase, "in_custody"),
    supabase.from("lost_reports").select("*").eq("status", "open").order("created_at", { ascending: false }).returns<LostReport[]>(),
    supabase.from("found_items").select("*", { count: "exact", head: true }).eq("status", "claimed"),
    supabase.from("lost_reports").select("*", { count: "exact", head: true }).eq("status", "matched"),
  ]);

  const suggestions = (reports ?? [])
    .map((r) => ({ report: r, matches: topMatches(r, items.map(toMatchable), 2) }))
    .filter((s) => s.matches.length)
    .sort((a, b) => b.matches[0].score - a.matches[0].score);

  const stats = [
    { label: "In custody", value: items.length, href: "/team/items" },
    { label: "Open lost reports", value: reports?.length ?? 0, href: "/team/reports" },
    { label: "Awaiting pickup (matched)", value: matched ?? 0, href: "/team/reports?status=matched" },
    { label: "Returned", value: claimed ?? 0, href: "/team/items?status=claimed" },
  ];

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Info Desk</p>
          <h1 className="mt-1 text-3xl font-extrabold">Dashboard</h1>
        </div>
        <Link href="/team/items/new" className="btn-primary">📷 Log found item</Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-5 hover:border-brand/40">
            <p className="text-3xl font-extrabold text-ink">{s.value}</p>
            <p className="mt-1 text-sm text-muted">{s.label}</p>
          </Link>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Possible matches</h2>
        <p className="text-sm text-muted">Open lost reports that look like something in custody. Always verify in person.</p>
        <div className="mt-4 space-y-3">
          {suggestions.length ? (
            suggestions.map(({ report, matches }) => (
              <div key={report.id} className="card grid gap-4 p-4 md:grid-cols-[1fr_auto_1.2fr] md:items-center">
                <div>
                  <p className="font-mono text-xs text-muted">{reportRef(report.ref_no)} · reported {timeAgo(report.created_at)}</p>
                  <p className="font-semibold text-ink">{report.title}</p>
                  <p className="line-clamp-1 text-sm text-muted">{report.description}</p>
                </div>
                <span className="hidden text-2xl text-brand md:block">⇄</span>
                <div className="space-y-2">
                  {matches.map(({ item, score }) => (
                    <Link key={item.id} href={`/team/items/${item.id}#matches`} className="flex items-center justify-between gap-3 rounded-xl bg-lavender px-3 py-2 text-sm hover:ring-1 hover:ring-brand/40">
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-xs text-muted">{itemRef(item.ref_no)}</span>{" "}
                        <span className="font-medium text-ink">{item.title ?? item.public_label}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-bold text-brand">{score}%</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="card p-6 text-sm text-muted">No likely matches right now.</p>
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Latest lost reports</h2>
        <div className="card mt-4 divide-y divide-line">
          {(reports ?? []).slice(0, 8).map((r) => (
            <Link key={r.id} href={`/team/reports#${r.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm hover:bg-lavender/60">
              <span className="font-mono text-xs text-muted">{reportRef(r.ref_no)}</span>
              <span className="font-medium text-ink">{r.title}</span>
              <CategoryTag value={r.category} />
              <span className="ml-auto text-xs text-muted">{formatDateTime(r.created_at)}</span>
            </Link>
          ))}
          {!reports?.length && <p className="p-4 text-sm text-muted">No open reports.</p>}
        </div>
      </section>
    </div>
  );
}
