import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { itemRef } from "@/lib/format";
import type { FoundItem, FoundItemPrivate } from "@/lib/types";
import { ItemForm } from "@/components/item-form";

export const metadata: Metadata = { title: "Edit item" };

export default async function EditItemPage({ params }: PageProps<"/team/items/[id]/edit">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const [{ data: item }, { data: details }] = await Promise.all([
    supabase.from("found_items").select("*").eq("id", id).maybeSingle<FoundItem>(),
    supabase.from("found_item_private").select("*").eq("item_id", id).maybeSingle<FoundItemPrivate>(),
  ]);
  if (!item) notFound();
  const photos = await signPhotoUrls(supabase, [item.photo_path]);

  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">{itemRef(item.ref_no)}</p>
      <h1 className="mt-1 text-3xl font-extrabold">Edit item</h1>
      <div className="mt-6">
        <ItemForm item={item} details={details} photoUrl={item.photo_path ? photos[item.photo_path] : undefined} />
      </div>
    </div>
  );
}
