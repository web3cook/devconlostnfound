import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { depositRef, formatDateTime, timeAgo } from "@/lib/format";
import { getViewer } from "@/lib/auth";
import type { CloakDeposit } from "@/lib/types";
import { DepositStatusBadge } from "@/components/badges";

export const metadata: Metadata = { title: "Cloakroom" };

const STATUS_OPTIONS = [
  { value: "stored", label: "In cloakroom" },
  { value: "collected", label: "Collected" },
  { value: "all", label: "All" },
];

export default async function CloakroomPage({ searchParams }: PageProps<"/team/cloakroom">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 80) : "";
  const viewer = await getViewer();
  const showArchived = sp.status === "archived" && Boolean(viewer?.isSuperadmin);
  const status = showArchived ? "archived" : sp.status === "collected" || sp.status === "all" ? sp.status : "stored";

  const supabase = await createClient();
  let query = supabase.from("cloak_deposits").select("*").order("deposited_at", { ascending: false }).limit(1000);
  query = showArchived ? query.not("archived_at", "is", null) : query.is("archived_at", null);
  if (status === "stored" || status === "collected") query = query.eq("status", status);
  const [{ data: all }, { data: stored }] = await Promise.all([
    query.returns<CloakDeposit[]>(),
    supabase.from("cloak_deposits").select("bag_count").eq("status", "stored").is("archived_at", null),
  ]);

  // Token, C-number, names and contacts are all searchable.
  const deposits = (all ?? []).filter((d) => {
    if (!q) return true;
    const ref = depositRef(d.ref_no).toLowerCase();
    return [d.token_no, ref, String(d.ref_no), d.depositor_name, d.depositor_phone, d.depositor_telegram, d.depositor_email, d.collector_name, d.bag_description]
      .some((v) => v?.toLowerCase().includes(q.replace(/^@/, "")));
  });
  const photos = await signPhotoUrls(supabase, deposits.map((d) => d.bag_photo_paths[0]));
  const bagsStored = (stored ?? []).reduce((n, r) => n + (r.bag_count as number), 0);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Info Desk</p>
          <h1 className="mt-1 text-3xl font-extrabold">Cloakroom</h1>
          <p className="text-sm text-muted">
            {bagsStored} bag{bagsStored === 1 ? "" : "s"} in storage across {stored?.length ?? 0} deposit
            {stored?.length === 1 ? "" : "s"}.
          </p>
        </div>
        <Link href="/team/cloakroom/new" className="btn-primary">🧳 Check in bags</Link>
      </div>

      <form action="/team/cloakroom" className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
        <input
          name="q"
          defaultValue={q}
          autoFocus
          placeholder="Token number, C-number, name, phone…"
          className="input font-mono text-base"
          aria-label="Search deposits"
        />
        <select name="status" defaultValue={status} className="input sm:w-44" aria-label="Status">
          {[...STATUS_OPTIONS, ...(viewer?.isSuperadmin ? [{ value: "archived", label: "Archived" }] : [])].map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <button className="btn-primary">Find</button>
      </form>

      <div className="card mt-6 divide-y divide-line overflow-hidden">
        {deposits.map((d) => (
          <Link key={d.id} href={`/team/cloakroom/${d.id}`} className="flex items-center gap-4 p-3 hover:bg-lavender/60">
            <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg bg-lavender">
              {photos[d.bag_photo_paths[0]] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photos[d.bag_photo_paths[0]]} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="grid w-16 shrink-0 place-items-center rounded-lg bg-night py-1.5 font-mono text-lg font-bold text-white">
              {d.token_no}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-mono text-xs text-muted">{depositRef(d.ref_no)}</span>{" "}
                <span className="font-semibold text-ink">{d.depositor_name}</span>{" "}
                <span className="text-muted">· {d.bag_count} bag{d.bag_count === 1 ? "" : "s"}</span>
              </p>
              <p className="truncate text-xs text-muted">
                In {formatDateTime(d.deposited_at)} ({timeAgo(d.deposited_at)})
                {d.status === "collected" && d.collected_at && <> · out {formatDateTime(d.collected_at)} by {d.collector_name}</>}
              </p>
            </div>
            <DepositStatusBadge status={d.status} />
          </Link>
        ))}
        {!deposits.length && <p className="p-6 text-sm text-muted">{q ? "No deposit matches that search." : "Nothing here."}</p>}
      </div>
    </div>
  );
}
