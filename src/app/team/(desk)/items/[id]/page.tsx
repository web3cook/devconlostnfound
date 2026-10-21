import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { topReportsFor } from "@/lib/match";
import { formatDateTime, itemRef, reportRef } from "@/lib/format";
import type { LostReport, TeamItem } from "@/lib/types";
import { publicLabel } from "@/lib/config";
import { TEAM_ITEM_SELECT, teamTitle, toMatchable } from "@/lib/team-items";
import { CategoryTag, ItemStatusBadge, ReportStatusBadge } from "@/components/badges";
import { ItemPhoto } from "@/components/item-photo";
import { deleteFoundItem, linkReport, unclaimItem, unlinkReport } from "@/app/team/actions";
import { ClaimForm } from "./claim-form";

export const metadata: Metadata = { title: "Item" };

function contactOf(r: LostReport) {
  return [r.contact_telegram && `@${r.contact_telegram}`, r.contact_phone, r.contact_email].filter(Boolean).join(" · ");
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium whitespace-pre-line text-ink">{value || "—"}</dd>
    </div>
  );
}

export default async function TeamItemPage({ params, searchParams }: PageProps<"/team/items/[id]">) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: item }, { data: linked }, { data: open }] = await Promise.all([
    supabase.from("found_items").select(TEAM_ITEM_SELECT).eq("id", id).maybeSingle<TeamItem>(),
    supabase.from("lost_reports").select("*").eq("matched_item_id", id).returns<LostReport[]>(),
    supabase.from("lost_reports").select("*").eq("status", "open").returns<LostReport[]>(),
  ]);
  if (!item) notFound();
  const info = item.found_item_details;
  const details = item.found_item_private;
  const photos = await signPhotoUrls(supabase, [info?.photo_path]);
  const suggestions = topReportsFor(toMatchable(item), open ?? [], 5, 20);
  const pending = (linked ?? []).filter((r) => r.status === "matched");

  return (
    <div className="container-page py-10">
      <Link href="/team/items" className="text-sm font-semibold text-brand hover:underline">← Inventory</Link>
      {saved && <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Saved. Tag the item with <strong className="font-mono">{itemRef(item.ref_no)}</strong>.</p>}

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-4">
          <div className="card aspect-[4/3] overflow-hidden">
            <ItemPhoto url={photos[info?.photo_path ?? ""]} category={item.category} />
          </div>
          <div className="rounded-xl bg-lavender px-4 py-3 text-sm">
            <span className="text-muted">Public listing: </span>
            <strong className="text-ink">{publicLabel(item)}</strong>
            <p className="mt-1 text-xs text-muted">
              {item.status === "claimed"
                ? "Returned, so the photo, title and description are now public. Location and claimant stay private."
                : "Photo, title, description and location stay hidden until the item is returned."}{" "}
              <Link href={`/items/${item.id}`} className="font-semibold text-brand hover:underline">View public page</Link>
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-night px-3 py-1 font-mono text-sm font-semibold text-white">{itemRef(item.ref_no)}</span>
              <ItemStatusBadge status={item.status} />
              <CategoryTag value={item.category} />
              <Link href={`/team/items/${item.id}/edit`} className="btn-secondary btn-sm ml-auto">Edit</Link>
            </div>
            <h1 className="mt-3 text-3xl font-extrabold">{teamTitle(item)}</h1>
            {info?.description && <p className="mt-2 whitespace-pre-line">{info.description}</p>}
            <dl className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Colour" value={info?.color} />
              <Field label="Found near" value={details?.found_location} />
              <Field label="Found at" value={formatDateTime(item.found_at)} />
              <Field label="Logged" value={formatDateTime(item.created_at)} />
            </dl>
          </div>

          <section className="card border-amber-200 bg-amber-50/60 p-5">
            <h2 className="font-bold">🔒 Team details</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Handed in by" value={details?.finder_name} />
              <Field label="Finder contact" value={details?.finder_contact} />
              <div className="sm:col-span-2"><Field label="Identifying details (ask claimant)" value={details?.verification_details} /></div>
              <div className="sm:col-span-2"><Field label="Internal notes" value={details?.internal_notes} /></div>
            </dl>
          </section>

          {item.status === "claimed" ? (
            <section className="card p-5">
              <h2 className="font-bold">Returned {formatDateTime(item.claimed_at)}</h2>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Collected by" value={details?.claimant_name} />
                <Field label="Contact" value={details?.claimant_contact} />
                <div className="sm:col-span-2"><Field label="Verification notes" value={details?.claim_notes} /></div>
                <Field label="Handed over by" value={details?.claimed_by_team} />
              </dl>
              <form action={unclaimItem} className="mt-4">
                <input type="hidden" name="id" value={item.id} />
                <button className="btn-ghost btn-sm text-red-600">Undo hand-over</button>
              </form>
            </section>
          ) : (
            <section className="card p-5">
              <h2 className="font-bold">Hand over to owner</h2>
              <p className="mb-4 text-sm text-muted">Ask them to describe the item first and check it against the identifying details.</p>
              <ClaimForm
                itemId={item.id}
                reports={pending.map((r) => ({
                  id: r.id,
                  label: `${reportRef(r.ref_no)} · ${r.contact_name} — ${r.title}`,
                  name: r.contact_name,
                  contact: contactOf(r),
                }))}
              />
            </section>
          )}
        </div>
      </div>

      <section id="matches" className="mt-12 scroll-mt-32">
        {linked && linked.length > 0 && (
          <>
            <h2 className="text-xl font-bold">Linked lost reports</h2>
            <div className="mt-3 space-y-3">
              {linked.map((r) => (
                <div key={r.id} className="card flex flex-wrap items-center gap-3 p-4 text-sm">
                  <span className="font-mono text-xs text-muted">{reportRef(r.ref_no)}</span>
                  <ReportStatusBadge status={r.status} />
                  <span className="font-semibold text-ink">{r.contact_name}</span>
                  <span className="text-muted">{contactOf(r)}</span>
                  {r.status === "matched" && (
                    <form action={unlinkReport} className="ml-auto">
                      <input type="hidden" name="report_id" value={r.id} />
                      <button className="btn-ghost btn-sm">Unlink</button>
                    </form>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {item.status === "in_custody" && (
          <>
            <h2 className="mt-8 text-xl font-bold">Lost reports that might be this item</h2>
            <p className="text-sm text-muted">Linking notifies the reporter on their “My reports” page. Contact them too.</p>
            <div className="mt-3 space-y-3">
              {suggestions.length ? (
                suggestions.map(({ report: r, score }) => (
                  <div key={r.id} className="card p-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="rounded-full bg-lavender px-2 py-0.5 text-xs font-bold text-brand">{score}%</span>
                      <span className="font-mono text-xs text-muted">{reportRef(r.ref_no)}</span>
                      <span className="font-semibold text-ink">{r.title}</span>
                      <CategoryTag value={r.category} />
                    </div>
                    <p className="mt-2 text-sm">{r.description}</p>
                    <p className="mt-1 text-xs text-muted">
                      {r.lost_location && <>📍 {r.lost_location} · </>}
                      {r.lost_at && <>lost ~{formatDateTime(r.lost_at)} · </>}
                      {r.contact_name} · {contactOf(r)}
                    </p>
                    <form action={linkReport} className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <input type="hidden" name="report_id" value={r.id} />
                      <input type="hidden" name="item_id" value={item.id} />
                      <input name="team_note" className="input sm:flex-1" placeholder="Message to reporter (optional)" maxLength={1000} />
                      <button className="btn-primary btn-sm">Link as match</button>
                    </form>
                  </div>
                ))
              ) : (
                <p className="card p-5 text-sm text-muted">
                  No similar open reports. <Link href="/team/reports" className="font-semibold text-brand hover:underline">Browse all reports</Link>
                </p>
              )}
            </div>
          </>
        )}
      </section>

      <form action={deleteFoundItem} className="mt-12 border-t border-line pt-6">
        <input type="hidden" name="id" value={item.id} />
        <button className="btn-danger btn-sm">Delete item (duplicates / mistakes only)</button>
      </form>
    </div>
  );
}
