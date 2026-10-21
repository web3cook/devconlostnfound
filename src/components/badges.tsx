import type { ItemStatus, ReportStatus } from "@/lib/types";
import { categoryMeta } from "@/lib/config";

const ITEM: Record<ItemStatus, { label: string; cls: string }> = {
  in_custody: { label: "At Info Desk", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  claimed: { label: "Returned to owner", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

const REPORT: Record<ReportStatus, { label: string; cls: string }> = {
  open: { label: "Searching", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  matched: { label: "Possible match", cls: "bg-violet-50 text-brand ring-violet-200" },
  returned: { label: "Returned", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  closed: { label: "Closed", cls: "bg-slate-100 text-slate-600 ring-slate-200" },
};

function Pill({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${cls}`}>
      {label}
    </span>
  );
}

export const ItemStatusBadge = ({ status }: { status: ItemStatus }) => <Pill {...ITEM[status]} />;
export const ReportStatusBadge = ({ status }: { status: ReportStatus }) => <Pill {...REPORT[status]} />;

export function CategoryTag({ value }: { value: string }) {
  const c = categoryMeta(value);
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-lavender px-2.5 py-0.5 text-xs font-medium text-ink">
      <span aria-hidden>{c.emoji}</span>
      {c.label}
    </span>
  );
}
