import type { ActivityEntry } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const ICON: Record<string, string> = {
  logged: "📥",
  filed: "📝",
  edited: "✏️",
  linked: "🔗",
  unlinked: "⛓️‍💥",
  claimed: "✅",
  returned: "✅",
  "claim undone": "↩️",
  "hand-over undone": "↩️",
  closed: "🗂️",
  reopened: "📂",
  "note updated": "💬",
  archived: "🗄️",
  restored: "♻️",
};

/** Read-only history. Entries are written by database triggers, never by the app. */
export function ActivityTimeline({ entries }: { entries: ActivityEntry[] }) {
  if (!entries.length) return <p className="text-sm text-muted">No history yet.</p>;
  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="flex gap-3 text-sm">
          <span aria-hidden className="mt-0.5 w-5 shrink-0 text-center">{ICON[e.action] ?? "•"}</span>
          <div className="min-w-0">
            <p>
              <span className="font-semibold text-ink capitalize">{e.action}</span>
              {e.summary && <span className="text-body"> · {e.summary}</span>}
            </p>
            <p className="text-xs text-muted">
              {formatDateTime(e.created_at)} · {e.actor ?? "unknown"}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
