import { CATEGORIES } from "@/lib/config";

/** GET form, so filters live in the URL and work without JS. */
export function ItemFilters({
  q,
  category,
  status,
  action,
  statusOptions = [
    { value: "in_custody", label: "At Info Desk" },
    { value: "claimed", label: "Returned" },
    { value: "all", label: "All" },
  ],
}: {
  q: string;
  category: string;
  status: string;
  action?: string;
  statusOptions?: { value: string; label: string }[];
}) {
  return (
    <form action={action} className="card mt-6 grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto_auto]">
      <input name="q" defaultValue={q} placeholder="Search: airpods, blue hoodie, XL room…" className="input" aria-label="Search" />
      <select name="category" defaultValue={category} className="input sm:w-52" aria-label="Category">
        <option value="">All categories</option>
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.emoji} {c.label}
          </option>
        ))}
      </select>
      <select name="status" defaultValue={status} className="input sm:w-40" aria-label="Status">
        {statusOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button className="btn-primary">Search</button>
    </form>
  );
}
