import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { depositRef, formatDateTime, timeAgo } from "@/lib/format";
import { loadActivity } from "@/lib/team-items";
import { getViewer } from "@/lib/auth";
import type { CloakDeposit } from "@/lib/types";
import { DepositStatusBadge } from "@/components/badges";
import { ActivityTimeline } from "@/components/activity-timeline";
import { archiveEntry, restoreEntry } from "@/app/team/actions";
import { uncollectDeposit } from "@/app/team/cloakroom-actions";
import { CollectForm } from "./collect-form";

export const metadata: Metadata = { title: "Deposit" };

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium whitespace-pre-line text-ink">{value || "—"}</dd>
    </div>
  );
}

export default async function DepositPage({ params, searchParams }: PageProps<"/team/cloakroom/[id]">) {
  const { id } = await params;
  const { saved } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: d }, history, viewer] = await Promise.all([
    supabase.from("cloak_deposits").select("*").eq("id", id).maybeSingle<CloakDeposit>(),
    loadActivity(supabase, { depositId: id }),
    getViewer(),
  ]);
  if (!d) notFound();
  if (d.archived_at && !viewer?.isSuperadmin) notFound();
  const archived = Boolean(d.archived_at);
  const photos = await signPhotoUrls(supabase, [...d.bag_photo_paths, d.token_photo_path]);

  return (
    <div className="container-page py-10">
      <Link href="/team/cloakroom" className="text-sm font-semibold text-brand hover:underline">← Cloakroom</Link>
      {archived && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-slate-200 px-4 py-3 text-sm">
          <span>🗄️ Archived {formatDateTime(d.archived_at)} by {d.archived_by ?? "superadmin"}. Hidden from the team.</span>
          <form action={restoreEntry} className="ml-auto">
            <input type="hidden" name="kind" value="deposit" />
            <input type="hidden" name="id" value={d.id} />
            <button className="btn-secondary btn-sm">Restore</button>
          </form>
        </div>
      )}
      {saved && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Saved as <strong className="font-mono">{depositRef(d.ref_no)}</strong>. Give them token <strong className="font-mono">{d.token_no}</strong>.
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <div className="rounded-2xl bg-night px-5 py-3 text-center text-white">
          <p className="text-[10px] font-semibold tracking-widest text-white/60 uppercase">Token</p>
          <p className="font-mono text-3xl font-extrabold">{d.token_no}</p>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm text-muted">{depositRef(d.ref_no)}</span>
            <DepositStatusBadge status={d.status} />
          </div>
          <h1 className="mt-1 text-3xl font-extrabold">
            {d.depositor_name} · {d.bag_count} bag{d.bag_count === 1 ? "" : "s"}
          </h1>
          {d.bag_description && <p className="text-sm">{d.bag_description}</p>}
        </div>
        {!archived && <Link href={`/team/cloakroom/${d.id}/edit`} className="btn-secondary btn-sm ml-auto">Edit</Link>}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {d.bag_photo_paths.map((p) => (
              <a key={p} href={photos[p]} target="_blank" rel="noreferrer" className="card aspect-square overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {photos[p] && <img src={photos[p]} alt="Bag" className="h-full w-full object-cover" />}
              </a>
            ))}
            <a href={photos[d.token_photo_path]} target="_blank" rel="noreferrer" className="card relative aspect-square overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photos[d.token_photo_path] && <img src={photos[d.token_photo_path]} alt="Token" className="h-full w-full object-cover" />}
              <span className="absolute bottom-2 left-2 rounded-full bg-night/80 px-2 py-0.5 text-[11px] font-semibold text-white">Token</span>
            </a>
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="font-bold">Deposited</h2>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Date & time" value={`${formatDateTime(d.deposited_at)} (${timeAgo(d.deposited_at)})`} />
              <Field label="Checked in by" value={d.checked_in_by} />
              <Field label="Phone" value={d.depositor_phone} />
              <Field label="Telegram" value={d.depositor_telegram && `@${d.depositor_telegram}`} />
              <Field label="Email" value={d.depositor_email} />
              {d.updated_by && <Field label="Last edited" value={`${formatDateTime(d.updated_at)} by ${d.updated_by}`} />}
              <div className="sm:col-span-2"><Field label="Notes" value={d.notes} /></div>
            </dl>
          </section>

          {d.status === "collected" ? (
            <section className="card p-5">
              <h2 className="font-bold">Collected {formatDateTime(d.collected_at)}</h2>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2">
                <Field label="Collected by" value={d.collector_name} />
                <Field label="Handed back by" value={d.collected_by_team} />
                <Field label="Phone" value={d.collector_phone} />
                <Field label="Telegram" value={d.collector_telegram && `@${d.collector_telegram}`} />
                <Field label="Email" value={d.collector_email} />
                <div className="sm:col-span-2"><Field label="Notes" value={d.collection_notes} /></div>
              </dl>
              {!archived && (
                <form action={uncollectDeposit} className="mt-4">
                  <input type="hidden" name="id" value={d.id} />
                  <button className="btn-ghost btn-sm text-red-600">Undo pickup</button>
                </form>
              )}
            </section>
          ) : archived ? null : (
            <section className="card p-5">
              <h2 className="font-bold">Hand bags back</h2>
              <p className="mb-4 text-sm text-muted">Take the token, check it matches, and compare the bags with the photos.</p>
              <CollectForm deposit={d} />
            </section>
          )}
        </div>
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-bold">History</h2>
        <div className="card mt-3 p-5">
          <ActivityTimeline entries={history} />
        </div>
      </section>

      {viewer?.isSuperadmin && !archived && (
        <form action={archiveEntry} className="mt-12 border-t border-line pt-6">
          <input type="hidden" name="kind" value="deposit" />
          <input type="hidden" name="id" value={d.id} />
          <button className="btn-danger btn-sm">Archive deposit (superadmin)</button>
          <p className="hint">Hides it from the team. It stays in the database with its history and can be restored.</p>
        </form>
      )}
    </div>
  );
}
