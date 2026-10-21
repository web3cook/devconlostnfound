export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg viewBox="0 0 24 36" className="h-7 w-auto" aria-hidden>
        <path d="M12 0 0 18.3 12 25.4l12-7.1L12 0Z" fill="currentColor" opacity=".9" />
        <path d="M12 27.7 0 20.6 12 36l12-15.4-12 7.1Z" fill="currentColor" opacity=".6" />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-lg font-medium tracking-[0.28em]">DEVCON</span>
        <span className="mt-0.5 text-[10px] font-semibold tracking-[0.3em] text-brand-soft">
          LOST &amp; FOUND
        </span>
      </span>
    </span>
  );
}
