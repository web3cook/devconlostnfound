import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { formatDateTime, itemRef, sanitizeSearch } from "@/lib/format";
import type { FoundItem, FoundItemPrivate } from "@/lib/types";
import { CategoryTag, ItemStatusBadge } from "@/components/badges";
import { ItemFilters } from "@/components/item-filters";
import { ItemPhoto } from "@/components/item-photo";

export const metadata: Metadata = { title: "Inventory" };

type Row = FoundItem & { found_item_private: FoundItemPrivate | null };

export default async function TeamItems({ searchParams }: PageProps<"/team/items">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sanitizeSearch(sp.q) : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const status = sp.status === "claimed" || sp.status === "all" ? sp.status : "in_custody";

  const supabase = await createClient();
  let query = supabase.from("found_items").select("*, found_item_private(*)").order("found_at", { ascending: false }).limit(500);
  if (status !== "all") query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,found_location.ilike.%${q}%,color.ilike.%${q}%`);
  const { data: items } = await query.returns<Row[]>();
  const photos = await signPhotoUrls(supabase, (items ?? []).map((i) => i.photo_path));

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Inventory</h1>
        <Link href="/team/items/new" className="btn-primary">📷 Log found item</Link>
      </div>
      <ItemFilters action="/team/items" q={q} category={category} status={status} />

      <div className="card mt-6 divide-y divide-line overflow-hidden">
        {items?.map((i) => (
          <Link key={i.id} href={`/team/items/${i.id}`} className="flex items-center gap-4 p-3 hover:bg-lavender/60">
            <div className="h-14 w-16 shrink-0 overflow-hidden rounded-lg">
              <ItemPhoto url={i.photo_path ? photos[i.photo_path] : undefined} category={i.category} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                <span className="font-mono text-xs text-muted">{itemRef(i.ref_no)}</span>{" "}
                <span className="font-semibold text-ink">{i.title}</span>
                {!i.photo_public && i.photo_path && <span className="ml-2 text-xs text-amber-700">photo hidden</span>}
              </p>
              <p className="truncate text-xs text-muted">
                📍 {i.found_location || "—"} · {formatDateTime(i.found_at)}
                {i.found_item_private?.finder_name && <> · from {i.found_item_private.finder_name}</>}
                {i.status === "claimed" && i.found_item_private?.claimant_name && <> · collected by {i.found_item_private.claimant_name}</>}
              </p>
            </div>
            <div className="hidden shrink-0 sm:block"><CategoryTag value={i.category} /></div>
            <ItemStatusBadge status={i.status} />
          </Link>
        ))}
        {!items?.length && <p className="p-6 text-sm text-muted">No items.</p>}
      </div>
    </div>
  );
}
