import { categoryMeta } from "@/lib/config";

/** Photo if the viewer may see it, otherwise a category placeholder. */
export function ItemPhoto({
  url,
  category,
  note,
  className = "",
}: {
  url?: string;
  category: string;
  /** Shown under the placeholder, e.g. why there's no photo. */
  note?: string;
  className?: string;
}) {
  if (url) {
    // Signed Supabase URLs expire, so skip next/image's optimizer cache.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  }
  return (
    <div
      className={`grid h-full w-full place-items-center bg-gradient-to-br from-lavender-2 via-lavender to-white text-center ${className}`}
    >
      <div>
        <span className="text-5xl" aria-hidden>
          {categoryMeta(category).emoji}
        </span>
        {note && <p className="mt-2 px-4 text-xs text-muted">{note}</p>}
      </div>
    </div>
  );
}
