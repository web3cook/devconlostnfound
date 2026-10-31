import Link from "next/link";
import type { FoundItem } from "@/lib/types";
import { publicLabel } from "@/lib/config";
import { formatDateTime, itemRef } from "@/lib/format";
import { CategoryTag, ItemStatusBadge } from "@/components/badges";
import { ItemPhoto } from "@/components/item-photo";

/**
 * Public card: only the generic label, category and date. Photos and details
 * are team-only, before and after hand-over, so the owner has to describe it.
 */
export function ItemCard({ item, href }: { item: FoundItem; href: string }) {
  return (
    <Link href={href} className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-brand/40">
      <div className="relative aspect-[4/3] overflow-hidden">
        <ItemPhoto category={item.category} note={item.status === "in_custody" ? "Describe it at the Info Desk to claim" : undefined} />
        <span className="absolute top-3 left-3 rounded-full bg-night/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-white">
          {itemRef(item.ref_no)}
        </span>
        <span className="absolute top-3 right-3">
          <ItemStatusBadge status={item.status} />
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-1 font-semibold group-hover:text-brand">{publicLabel(item)}</h3>
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-xs text-muted">
          <CategoryTag value={item.category} />
        </div>
        <p className="text-xs text-muted">Found {formatDateTime(item.found_at)}</p>
      </div>
    </Link>
  );
}
