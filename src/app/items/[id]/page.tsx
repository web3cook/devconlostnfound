import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { formatDateTime, itemRef } from "@/lib/format";
import { INFO_DESK } from "@/lib/config";
import { getViewer } from "@/lib/auth";
import type { FoundItem } from "@/lib/types";
import { CategoryTag, ItemStatusBadge } from "@/components/badges";
import { ItemPhoto } from "@/components/item-photo";

const UUID = /^[0-9a-f-]{36}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("found_items").select("*").eq("id", id).maybeSingle<FoundItem>();
  if (!data) return null;
  const photos = await signPhotoUrls(supabase, [data.photo_path]);
  return { item: data, photoUrl: data.photo_path ? photos[data.photo_path] : undefined };
}

export async function generateMetadata({ params }: PageProps<"/items/[id]">): Promise<Metadata> {
  const res = await load((await params).id);
  return { title: res ? `${itemRef(res.item.ref_no)} · ${res.item.title}` : "Item not found" };
}

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const res = await load(id);
  if (!res) notFound();
  const { item, photoUrl } = res;
  const viewer = await getViewer();

  return (
    <div className="container-page py-10">
      <Link href="/items" className="text-sm font-semibold text-brand hover:underline">
        ← All found items
      </Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="card aspect-[4/3] overflow-hidden">
          <ItemPhoto url={photoUrl} category={item.category} hidden={Boolean(item.photo_path) && !photoUrl} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-night px-3 py-1 font-mono text-xs font-semibold text-white">{itemRef(item.ref_no)}</span>
            <ItemStatusBadge status={item.status} />
            <CategoryTag value={item.category} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold">{item.title}</h1>
          {item.description && <p className="mt-3 leading-relaxed whitespace-pre-line">{item.description}</p>}

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
            {item.color && (
              <div>
                <dt className="text-muted">Colour</dt>
                <dd className="font-medium text-ink">{item.color}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted">Found near</dt>
              <dd className="font-medium text-ink">{item.found_location || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Found at</dt>
              <dd className="font-medium text-ink">{formatDateTime(item.found_at)}</dd>
            </div>
          </dl>

          {item.status === "in_custody" ? (
            <div className="mt-8 rounded-2xl border border-brand/20 bg-lavender p-5">
              <h2 className="font-bold">Is this yours?</h2>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li>
                  Go to the <strong>{INFO_DESK.location}</strong>.
                </li>
                <li>
                  Give them the reference <strong className="font-mono">{itemRef(item.ref_no)}</strong>.
                </li>
                <li>Describe it in detail — anything not shown here helps us confirm it&apos;s yours.</li>
              </ol>
              <p className="mt-3 text-xs text-muted">
                Bring your Devcon badge or ID. Items are only handed over in person.
              </p>
            </div>
          ) : (
            <p className="mt-8 rounded-2xl bg-slate-100 p-5 text-sm">
              This item has been returned to its owner. If you think there&apos;s been a mistake, speak to the Info Desk.
            </p>
          )}

          {viewer?.isTeam && (
            <Link href={`/team/items/${item.id}`} className="btn-secondary mt-4">
              Open in team desk
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
