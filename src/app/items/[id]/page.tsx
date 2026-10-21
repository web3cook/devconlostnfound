import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { formatDateTime, itemRef } from "@/lib/format";
import { INFO_DESK, publicLabel } from "@/lib/config";
import { getViewer } from "@/lib/auth";
import type { FoundItemWithDetails } from "@/lib/types";
import { CategoryTag, ItemStatusBadge } from "@/components/badges";
import { ItemPhoto } from "@/components/item-photo";

const UUID = /^[0-9a-f-]{36}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("found_items")
    .select("*, found_item_details(*)")
    .eq("id", id)
    .maybeSingle<FoundItemWithDetails>();
  if (!data) return null;
  const path = data.found_item_details?.photo_path;
  const photos = await signPhotoUrls(supabase, [path]);
  return { item: data, photoUrl: path ? photos[path] : undefined };
}

export async function generateMetadata({ params }: PageProps<"/items/[id]">): Promise<Metadata> {
  const res = await load((await params).id);
  return { title: res ? `${itemRef(res.item.ref_no)} · ${publicLabel(res.item)}` : "Item not found" };
}

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const res = await load(id);
  if (!res) notFound();
  const { item, photoUrl } = res;
  const viewer = await getViewer();
  const claimed = item.status === "claimed";
  // RLS only returns details to the public once the item has been returned.
  const details = claimed ? item.found_item_details : null;

  return (
    <div className="container-page py-10">
      <Link href="/items" className="text-sm font-semibold text-brand hover:underline">
        ← All found items
      </Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="card aspect-[4/3] overflow-hidden">
          <ItemPhoto
            url={claimed ? photoUrl : undefined}
            category={item.category}
            note={claimed ? undefined : "Photo and details are kept private until the owner claims it"}
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-night px-3 py-1 font-mono text-xs font-semibold text-white">{itemRef(item.ref_no)}</span>
            <ItemStatusBadge status={item.status} />
            <CategoryTag value={item.category} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold">{details?.title ?? publicLabel(item)}</h1>
          {details?.description && <p className="mt-3 leading-relaxed whitespace-pre-line">{details.description}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {details?.color && (
              <div>
                <dt className="text-muted">Colour</dt>
                <dd className="font-medium text-ink">{details.color}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted">Found</dt>
              <dd className="font-medium text-ink">{formatDateTime(item.found_at)}</dd>
            </div>
            {claimed && (
              <div>
                <dt className="text-muted">Returned</dt>
                <dd className="font-medium text-ink">{formatDateTime(item.claimed_at)}</dd>
              </div>
            )}
          </dl>

          {claimed ? (
            <p className="mt-8 rounded-2xl bg-slate-100 p-5 text-sm">
              This item has been returned to its owner. If you think there&apos;s been a mistake, speak to the Info Desk.
            </p>
          ) : (
            <div className="mt-8 rounded-2xl border border-brand/20 bg-lavender p-5">
              <h2 className="font-bold">Could this be yours?</h2>
              <p className="mt-1 text-sm">
                We only show a generic description so that the real owner can prove it&apos;s theirs.
              </p>
              <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                <li>
                  Go to the <strong>{INFO_DESK.location}</strong>.
                </li>
                <li>
                  Give them the reference <strong className="font-mono">{itemRef(item.ref_no)}</strong>.
                </li>
                <li>Describe it: colour, brand, stickers, marks, what&apos;s inside, where you lost it.</li>
              </ol>
              <p className="mt-3 text-xs text-muted">Bring your Devcon badge or ID. Items are only handed over in person.</p>
            </div>
          )}

          {viewer?.isTeam && (
            <Link href={`/team/items/${item.id}`} className="btn-secondary mt-4">
              Open in team desk (full details)
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
