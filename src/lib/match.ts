import type { LostReport } from "@/lib/types";

/** Everything the matcher looks at. Built from team-visible data only. */
export type MatchableItem = {
  category: string;
  found_at: string;
  public_label: string | null;
  title?: string | null;
  description?: string | null;
  color?: string | null;
  found_location?: string | null;
};

const STOP = new Set(
  "a an the and or of in on at to for with my is it its this that was from near by black white grey gray silver one some".split(
    " ",
  ),
);

function tokens(...parts: (string | null | undefined)[]) {
  return new Set(
    parts
      .join(" ")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP.has(t)),
  );
}

/**
 * Rough 0–100 score of how likely a found item is the thing someone lost.
 * Only used to rank suggestions for the team; a human always confirms.
 */
export function matchScore(item: MatchableItem, report: LostReport) {
  let score = 0;
  if (item.category === report.category && item.category !== "other") score += 35;

  const a = tokens(item.title, item.public_label, item.description);
  const b = tokens(report.title, report.description);
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  if (a.size && b.size) score += Math.min(40, Math.round((shared / Math.min(a.size, b.size)) * 60));

  const ca = tokens(item.color);
  const cb = tokens(report.color, report.title, report.description);
  for (const t of ca) if (cb.has(t)) { score += 10; break; }

  const la = tokens(item.found_location);
  const lb = tokens(report.lost_location);
  for (const t of la) if (lb.has(t)) { score += 10; break; }

  // Found well before it was reported lost is fine; found long before it was
  // lost is unlikely.
  if (report.lost_at) {
    const hours = (new Date(item.found_at).getTime() - new Date(report.lost_at).getTime()) / 36e5;
    if (hours < -6) score -= 20;
    else if (hours <= 24) score += 5;
  }

  return Math.max(0, Math.min(100, score));
}

export function topMatches<T extends MatchableItem>(report: LostReport, items: T[], limit = 3, min = 30) {
  return items
    .map((item) => ({ item, score: matchScore(item, report) }))
    .filter((m) => m.score >= min)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

export function topReportsFor<T extends LostReport>(item: MatchableItem, reports: T[], limit = 5, min = 30) {
  return reports
    .map((report) => ({ report, score: matchScore(item, report) }))
    .filter((m) => m.score >= min)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}
