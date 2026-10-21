import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { topMatches } from "@/lib/match";
import { formatDateTime, itemRef, reportRef, sanitizeSearch } from "@/lib/format";
import type { FoundItem, LostReport, ReportStatus } from "@/lib/types";
import { publicLabel } from "@/lib/config";
import { loadTeamItems, teamTitle, toMatchable } from "@/lib/team-items";
import { CategoryTag, ReportStatusBadge } from "@/components/badges";
import { ItemFilters } from "@/components/item-filters";
import { linkReport, saveTeamNote, setReportStatus, unlinkReport } from "@/app/team/actions";

export const metadata: Metadata = { title: "Lost reports" };

const STATUSES: ReportStatus[] = ["open", "matched", "returned", "closed"];
type Row = LostReport & {
  matched_item: (Pick<FoundItem, "id" | "ref_no" | "public_label" | "category"> & { found_item_details: { title: string } | null }) | null;
};

export default async function TeamReports({ searchParams }: PageProps<"/team/reports">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sanitizeSearch(sp.q) : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const saved = typeof sp.saved === "string" ? sp.saved : "";
  const status = STATUSES.includes(sp.status as ReportStatus) || sp.status === "all" ? String(sp.status) : "open";

  const supabase = await createClient();
  let query = supabase
    .from("lost_reports")
    .select("*, matched_item:found_items(id, ref_no, public_label, category, found_item_details(title))")
    .order("created_at", { ascending: false })
    .limit(500);
  if (status !== "all") query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,lost_location.ilike.%${q}%,contact_name.ilike.%${q}%`);

  const [{ data: reports }, teamItems] = await Promise.all([query.returns<Row[]>(), loadTeamItems(supabase, "in_custody")]);
  const items = teamItems.map((i) => ({ ...toMatchable(i), label: teamTitle(i) }));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Lost reports</h1>
          <p className="text-sm text-muted">Filed at the Info Desk. Match them against the inventory and contact the attendee.</p>
        </div>
        <Link href="/team/reports/new" className="btn-primary">+ File lost report</Link>
      </div>
      <ItemFilters
        action="/team/reports"
        q={q}
        category={category}
        status={status}
        statusOptions={[
          { value: "open", label: "Searching" },
          { value: "matched", label: "Matched" },
          { value: "returned", label: "Returned" },
          { value: "closed", label: "Closed" },
          { value: "all", label: "All" },
        ]}
      />

      <div className="mt-6 space-y-4">
        {reports?.map((r) => {
          const justSaved = r.id === saved;
          const suggestions = r.status === "open" ? topMatches(r, items, 3, 20) : [];
          return (
            <article key={r.id} id={r.id} className={`card scroll-mt-32 p-5 ${justSaved ? "ring-2 ring-emerald-400" : ""}`}>
              {justSaved && (
                <p className="mb-3 rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                  Saved. Give the attendee reference <strong className="font-mono">{reportRef(r.ref_no)}</strong>.
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted">{reportRef(r.ref_no)}</span>
                <ReportStatusBadge status={r.status} />
                <CategoryTag value={r.category} />
                <span className="ml-auto text-xs text-muted">
                  {formatDateTime(r.created_at)}
                  {r.filed_by ? <> · filed by {r.filed_by}</> : <> · reported online</>}
                </span>
                <Link href={`/team/reports/${r.id}/edit`} className="btn-secondary btn-sm">Edit</Link>
              </div>
              <div className="mt-3 grid gap-5 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <h2 className="text-lg font-bold">{r.title}</h2>
                  <p className="mt-1 text-sm whitespace-pre-line">{r.description}</p>
                  <p className="mt-2 text-xs text-muted">
                    {r.color && <>🎨 {r.color} · </>}
                    {r.lost_location && <>📍 {r.lost_location} · </>}
                    {r.lost_at ? <>lost ~{formatDateTime(r.lost_at)}</> : "time unknown"}
                  </p>
                </div>
                <div className="rounded-xl bg-lavender p-3 text-sm">
                  <p className="font-semibold text-ink">{r.contact_name}</p>
                  {r.contact_telegram && (
                    <p><a className="text-brand hover:underline" href={`https://t.me/${r.contact_telegram}`} target="_blank" rel="noreferrer">@{r.contact_telegram}</a></p>
                  )}
                  {r.contact_phone && <p><a className="text-brand hover:underline" href={`tel:${r.contact_phone}`}>{r.contact_phone}</a></p>}
                  {r.contact_email && <p><a className="text-brand hover:underline" href={`mailto:${r.contact_email}`}>{r.contact_email}</a></p>}
                </div>
              </div>

              {r.matched_item && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-brand/20 p-3 text-sm">
                  <span>Matched to</span>
                  <Link href={`/team/items/${r.matched_item.id}`} className="font-semibold text-brand hover:underline">
                    {itemRef(r.matched_item.ref_no)} · {r.matched_item.found_item_details?.title ?? publicLabel(r.matched_item)}
                  </Link>
                  {r.status === "matched" && (
                    <form action={unlinkReport} className="ml-auto">
                      <input type="hidden" name="report_id" value={r.id} />
                      <button className="btn-ghost btn-sm">Unlink</button>
                    </form>
                  )}
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold tracking-wide text-muted uppercase">Suggested items</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {suggestions.map(({ item, score }) => (
                      <Link key={item.id} href={`/team/items/${item.id}#matches`} className="rounded-full bg-lavender px-3 py-1 text-sm hover:ring-1 hover:ring-brand/40">
                        <span className="font-mono text-xs">{itemRef(item.ref_no)}</span> {item.label}{" "}
                        <span className="font-bold text-brand">{score}%</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4 lg:flex-row lg:items-end">
                {r.status === "open" && items.length > 0 && (
                  <form action={linkReport} className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="report_id" value={r.id} />
                    <select name="item_id" className="input sm:max-w-64" required defaultValue={suggestions[0]?.item.id ?? ""}>
                      <option value="" disabled>Link to item…</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>{itemRef(i.ref_no)} · {i.label}</option>
                      ))}
                    </select>
                    <input name="team_note" className="input sm:flex-1" placeholder="Message to reporter (optional)" maxLength={1000} />
                    <button className="btn-primary btn-sm">Link</button>
                  </form>
                )}
                {r.status !== "open" && (
                  <form action={saveTeamNote} className="flex flex-1 flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="report_id" value={r.id} />
                    <input name="team_note" defaultValue={r.team_note ?? ""} className="input sm:flex-1" placeholder="Message to reporter" maxLength={1000} />
                    <button className="btn-secondary btn-sm">Save note</button>
                  </form>
                )}
                {(r.status === "open" || r.status === "closed") && (
                  <form action={setReportStatus}>
                    <input type="hidden" name="report_id" value={r.id} />
                    <input type="hidden" name="status" value={r.status === "open" ? "closed" : "open"} />
                    <button className="btn-ghost btn-sm">{r.status === "open" ? "Close report" : "Reopen"}</button>
                  </form>
                )}
              </div>
            </article>
          );
        })}
        {!reports?.length && <p className="card p-6 text-sm text-muted">No reports.</p>}
      </div>
    </div>
  );
}
