import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, itemRef } from "@/lib/format";
import { INFO_DESK, publicLabel } from "@/lib/config";
import { getViewer } from "@/lib/auth";
import type { FoundItem } from "@/lib/types";
import { CategoryTag, ItemStatusBadge } from "@/components/badges";
import { ItemPhoto } from "@/components/item-photo";

const UUID = /^[0-9a-f-]{36}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  // RLS hides archived items from the public; details and photos are team-only.
  const { data } = await supabase.from("found_items").select("*").eq("id", id).maybeSingle<FoundItem>();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/items/[id]">): Promise<Metadata> {
  const item = await load((await params).id);
  return { title: item ? `${itemRef(item.ref_no)} · ${publicLabel(item)}` : "Item not found" };
}

export default async function ItemPage({ params }: PageProps<"/items/[id]">) {
  const { id } = await params;
  const item = await load(id);
  if (!item || item.archived_at) notFound();
  const viewer = await getViewer();
  const claimed = item.status === "claimed";

  return (
    <div className="container-page py-10">
      <Link href="/items" className="text-sm font-semibold text-brand hover:underline">
        ← All found items
      </Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="card aspect-[4/3] overflow-hidden">
          <ItemPhoto category={item.category} note={claimed ? undefined : "Photo and details are kept private so the owner can prove it's theirs"} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-night px-3 py-1 font-mono text-xs font-semibold text-white">{itemRef(item.ref_no)}</span>
            <ItemStatusBadge status={item.status} />
            <CategoryTag value={item.category} />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold">{publicLabel(item)}</h1>

          <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
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
