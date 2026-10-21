export function PageSkeleton() {
  return (
    <div className="container-page py-16" aria-busy="true" aria-label="Loading">
      <div className="h-5 w-40 animate-pulse rounded-full bg-lavender-2" />
      <div className="mt-4 h-10 w-72 max-w-full animate-pulse rounded-full bg-lavender-2" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card aspect-[4/5] animate-pulse" />
        ))}
      </div>
    </div>
  );
}
