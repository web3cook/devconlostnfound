import Link from "next/link";
import type { FoundItemWithDetails } from "@/lib/types";
import { publicLabel } from "@/lib/config";
import { formatDateTime, itemRef } from "@/lib/format";
import { CategoryTag, ItemStatusBadge } from "@/components/badges";
import { ItemPhoto } from "@/components/item-photo";

/**
 * Public card. While an item is at the Info Desk the public only gets its
 * generic label; details (and the photo) arrive once it's been returned.
 */
export function ItemCard({ item, photoUrl, href }: { item: FoundItemWithDetails; photoUrl?: string; href: string }) {
  const details = item.found_item_details;
  return (
    <Link href={href} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-brand/40">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ItemPhoto url={photoUrl} category={item.category} note={item.status === "in_custody" ? "Describe it at the Info Desk to claim" : undefined} />
        <span className="absolute top-3 left-3 rounded-full bg-night/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
          {itemRef(item.ref_no)}
        </span>
        <span className="absolute top-3 right-3">
          <ItemStatusBadge status={item.status} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold group-hover:text-brand">{details?.title ?? publicLabel(item)}</h3>
        {details?.description && <p className="line-clamp-2 text-sm text-muted">{details.description}</p>}
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-muted">
          <CategoryTag value={item.category} />
        </div>
        <p className="text-xs text-muted">Found {formatDateTime(item.found_at)}</p>
      </div>
    </Link>
  );
}
