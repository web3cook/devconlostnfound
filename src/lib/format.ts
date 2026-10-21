import { EVENT } from "@/lib/config";

export const itemRef = (n: number) => `F-${String(n).padStart(4, "0")}`;
export const reportRef = (n: number) => `L-${String(n).padStart(4, "0")}`;

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: EVENT.timeZone,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return dateTime.format(new Date(iso));
}

export function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Strip characters that would break a PostgREST `or=(...)` filter. */
export function sanitizeSearch(q: string) {
  return q.replace(/[,()*\\%:"']/g, " ").trim().slice(0, 80);
}
