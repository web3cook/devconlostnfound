import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { formatDateTime, itemRef } from "@/lib/format";
import { publicLabel } from "@/lib/config";
import { loadTeamItems, teamTitle } from "@/lib/team-items";
import { CategoryTag, ItemStatusBadge } from "@/components/badges";
import { ItemFilters } from "@/components/item-filters";
import { ItemPhoto } from "@/components/item-photo";

export const metadata: Metadata = { title: "Inventory" };

export default async function TeamItems({ searchParams }: PageProps<"/team/items">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase().slice(0, 80) : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const status = sp.status === "claimed" || sp.status === "all" ? sp.status : "in_custody";

  const supabase = await createClient();
  const all = await loadTeamItems(supabase, status === "all" ? undefined : status);
  // Search spans the public label and the team-only fields, so filter here.
  const items = all.filter((i) => {
    if (category && i.category !== category) return false;
    if (!q) return true;
    const d = i.found_item_details;
    const p = i.found_item_private;
    return [i.public_label, d?.title, d?.description, d?.color, p?.found_location, p?.finder_name, p?.claimant_name, String(i.ref_no)]
      .some((v) => v?.toLowerCase().includes(q));
  });
  const photos = await signPhotoUrls(supabase, items.map((i) => i.found_item_details?.photo_path));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Inventory</h1>
        <Link href="/team/items/new" className="btn-primary">📷 Log found item</Link>
      </div>
      <ItemFilters action="/team/items" q={q} category={category} status={status} placeholder="Search anything: title, colour, location, finder…" />

      <div className="card mt-6 divide-y divide-line overflow-hidden">
        {items.map((i) => (
          <Link key={i.id} href={`/team/items/${i.id}`} className="flex items-center gap-4 p-3 hover:bg-lavender/60">
            <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg">
              <ItemPhoto url={photos[i.found_item_details?.photo_path ?? ""]} category={i.category} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-mono text-xs text-muted">{itemRef(i.ref_no)}</span>{" "}
                <span className="font-semibold text-ink">{teamTitle(i)}</span>
                <span className="ml-2 text-xs text-muted">public: “{publicLabel(i)}”</span>
              </p>
              <p className="truncate text-xs text-muted">
                📍 {i.found_item_private?.found_location || "—"} · {formatDateTime(i.found_at)}
                {i.found_item_private?.finder_name && <> · from {i.found_item_private.finder_name}</>}
                {i.status === "claimed" && i.found_item_private?.claimant_name && <> · collected by {i.found_item_private.claimant_name}</>}
              </p>
            </div>
            <div className="hidden shrink-0 sm:block"><CategoryTag value={i.category} /></div>
            <ItemStatusBadge status={i.status} />
          </Link>
        ))}
        {!items.length && <p className="p-6 text-sm text-muted">No items.</p>}
      </div>
    </div>
  );
}
