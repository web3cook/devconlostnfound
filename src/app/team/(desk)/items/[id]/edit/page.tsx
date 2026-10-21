import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { itemRef } from "@/lib/format";
import { TEAM_ITEM_SELECT } from "@/lib/team-items";
import type { TeamItem } from "@/lib/types";
import { ItemForm } from "@/components/item-form";

export const metadata: Metadata = { title: "Edit item" };

export default async function EditItemPage({ params }: PageProps<"/team/items/[id]/edit">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: item } = await supabase.from("found_items").select(TEAM_ITEM_SELECT).eq("id", id).maybeSingle<TeamItem>();
  if (!item) notFound();
  const path = item.found_item_details?.photo_path;
  const photos = await signPhotoUrls(supabase, [path]);

  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">{itemRef(item.ref_no)}</p>
      <h1 className="mt-1 text-3xl font-extrabold">Edit item</h1>
      <div className="mt-6">
        <ItemForm item={item} photoUrl={path ? photos[path] : undefined} />
      </div>
    </div>
  );
}
