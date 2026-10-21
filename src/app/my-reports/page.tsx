import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { formatDateTime, itemRef, reportRef } from "@/lib/format";
import { INFO_DESK, publicLabel } from "@/lib/config";
import type { FoundItemWithDetails, LostReport } from "@/lib/types";
import { CategoryTag, ReportStatusBadge } from "@/components/badges";
import { ItemPhoto } from "@/components/item-photo";
import { closeLostReport, deleteLostReport, reopenLostReport } from "../report/actions";

export const metadata: Metadata = { title: "My reports" };

type Row = LostReport & { matched_item: FoundItemWithDetails | null };

export default async function MyReportsPage({ searchParams }: PageProps<"/my-reports">) {
  const viewer = await requireViewer("/my-reports");
  const { created } = await searchParams;
  const supabase = await createClient();
  const { data: reports } = await supabase
    .from("lost_reports")
    .select("*, matched_item:found_items(*, found_item_details(*))")
    .eq("user_id", viewer.id)
    .order("created_at", { ascending: false })
    .returns<Row[]>();
  const photos = await signPhotoUrls(supabase, (reports ?? []).map((r) => r.matched_item?.found_item_details?.photo_path));

  return (
    <div className="container-page max-w-4xl py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your lost items</p>
          <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">My reports</h1>
        </div>
        <Link href="/report" className="btn-primary">
          + Report another item
        </Link>
      </div>

      {created && (
        <p className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Report submitted. The Info Desk team will contact you if a matching item is handed in.
        </p>
      )}

      <div className="mt-8 space-y-5">
        {reports?.length ? (
          reports.map((r) => (
            <article key={r.id} className="card p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted">{reportRef(r.ref_no)}</span>
                <ReportStatusBadge status={r.status} />
                <CategoryTag value={r.category} />
                <span className="ml-auto text-xs text-muted">Reported {formatDateTime(r.created_at)}</span>
              </div>
              <h2 className="mt-3 text-xl font-bold">{r.title}</h2>
              <p className="mt-1 text-sm whitespace-pre-line">{r.description}</p>
              <p className="mt-2 text-xs text-muted">
                {r.lost_location && <>📍 {r.lost_location} · </>}
                {r.lost_at ? `Lost around ${formatDateTime(r.lost_at)}` : "Time not given"}
              </p>

              {(r.status === "matched" || r.status === "returned") && r.matched_item && (
                <div className="mt-5 flex gap-4 rounded-2xl border border-brand/20 bg-lavender p-4">
                  <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl">
                    <ItemPhoto
                      url={photos[r.matched_item.found_item_details?.photo_path ?? ""]}
                      category={r.matched_item.category}
                    />
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-ink">
                      {r.status === "returned" ? "Returned to you 🎉" : "We may have found it!"}
                    </p>
                    <p>
                      <Link href={`/items/${r.matched_item.id}`} className="font-semibold text-brand hover:underline">
                        {itemRef(r.matched_item.ref_no)} · {r.matched_item.found_item_details?.title ?? publicLabel(r.matched_item)}
                      </Link>
                    </p>
                    {r.status === "matched" && (
                      <p className="mt-1 text-muted">
                        Come to the {INFO_DESK.location} with this reference. You&apos;ll be asked to describe the item to confirm it&apos;s yours.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {r.team_note && (
                <p className="mt-4 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-line">
                  <span className="font-semibold text-ink">Message from the Info Desk:</span> {r.team_note}
                </p>
              )}

              <div className="mt-5 flex flex-wrap gap-2">
                {r.status === "open" || r.status === "matched" ? (
                  <form action={closeLostReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn-secondary btn-sm">I found it myself — close</button>
                  </form>
                ) : r.status === "closed" ? (
                  <form action={reopenLostReport}>
                    <input type="hidden" name="id" value={r.id} />
                    <button className="btn-secondary btn-sm">Reopen</button>
                  </form>
                ) : null}
                <form action={deleteLostReport}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="btn-ghost btn-sm text-red-600">Delete</button>
                </form>
              </div>
            </article>
          ))
        ) : (
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold text-ink">No reports yet</p>
            <p className="mt-1 text-sm text-muted">Hopefully you never need one!</p>
          </div>
        )}
      </div>
    </div>
  );
}
