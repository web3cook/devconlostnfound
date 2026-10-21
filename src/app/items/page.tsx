import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { sanitizeSearch } from "@/lib/format";
import type { FoundItemWithDetails } from "@/lib/types";
import { ItemCard } from "@/components/item-card";
import { ItemFilters } from "@/components/item-filters";

export const metadata: Metadata = { title: "Found items" };

export default async function ItemsPage({ searchParams }: PageProps<"/items">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sanitizeSearch(sp.q) : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const status = sp.status === "claimed" || sp.status === "all" ? sp.status : "in_custody";

  const supabase = await createClient();
  let query = supabase.from("found_items").select("*, found_item_details(*)").order("found_at", { ascending: false }).limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  // Only the generic label is searchable: details stay hidden until hand-over.
  if (q) query = query.ilike("public_label", `%${q}%`);
  const { data: items } = await query.returns<FoundItemWithDetails[]>();
  const photos = await signPhotoUrls(supabase, (items ?? []).map((i) => i.found_item_details?.photo_path));

  return (
    <div className="container-page py-12">
      <p className="eyebrow">Info Desk inventory</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Found items</h1>
      <p className="mt-2 max-w-2xl">
        Items are listed with a generic label only, so the real owner can describe what makes theirs unique.
        See something that might be yours? Note its reference number and come to the Info Desk.
      </p>

      <ItemFilters q={q} category={category} status={status} />

      {items?.length ? (
        <>
          <p className="mt-6 text-sm text-muted">{items.length} item{items.length === 1 ? "" : "s"}</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} photoUrl={photos[item.found_item_details?.photo_path ?? ""]} href={`/items/${item.id}`} />
            ))}
          </div>
        </>
      ) : (
        <div className="card mt-8 p-10 text-center">
          <p className="text-lg font-semibold text-ink">No matching items</p>
          <p className="mt-1 text-sm text-muted">
            It may not have been handed in yet. Report it and we&apos;ll reach out if it shows up.
          </p>
          <Link href="/report" className="btn-primary mt-5">
            Report a lost item
          </Link>
        </div>
      )}
    </div>
  );
}
