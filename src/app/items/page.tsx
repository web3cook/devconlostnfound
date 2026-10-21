import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { sanitizeSearch } from "@/lib/format";
import type { FoundItem } from "@/lib/types";
import { ItemCard } from "@/components/item-card";
import { ItemFilters } from "@/components/item-filters";

export const metadata: Metadata = { title: "Found items" };

export default async function ItemsPage({ searchParams }: PageProps<"/items">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sanitizeSearch(sp.q) : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const status = sp.status === "claimed" || sp.status === "all" ? sp.status : "in_custody";

  const supabase = await createClient();
  let query = supabase.from("found_items").select("*").order("found_at", { ascending: false }).limit(200);
  if (status !== "all") query = query.eq("status", status);
  if (category) query = query.eq("category", category);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,found_location.ilike.%${q}%,color.ilike.%${q}%`);
  const { data: items } = await query.returns<FoundItem[]>();
  const photos = await signPhotoUrls(supabase, (items ?? []).map((i) => i.photo_path));

  return (
    <div className="container-page py-12">
      <p className="eyebrow">Info Desk inventory</p>
      <h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">Found items</h1>
      <p className="mt-2 max-w-2xl">
        See something that&apos;s yours? Note its reference number and come to the Info Desk. You&apos;ll be
        asked to describe it so we can make sure it goes back to the right person.
      </p>

      <ItemFilters q={q} category={category} status={status} />

      {items?.length ? (
        <>
          <p className="mt-6 text-sm text-muted">{items.length} item{items.length === 1 ? "" : "s"}</p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} photoUrl={item.photo_path ? photos[item.photo_path] : undefined} href={`/items/${item.id}`} />
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
