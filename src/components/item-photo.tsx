import { categoryMeta } from "@/lib/config";

/** Photo if the viewer may see it, otherwise a category placeholder. */
export function ItemPhoto({
  url,
  category,
  hidden,
  className = "",
}: {
  url?: string;
  category: string;
  hidden?: boolean;
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
        {hidden && <p className="mt-2 px-4 text-xs text-muted">Photo hidden — describe it at the Info Desk</p>}
      </div>
    </div>
  );
}
