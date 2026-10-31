import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityEntry, TeamItem } from "@/lib/types";
import type { MatchableItem } from "@/lib/match";

export type { TeamItem };

export const TEAM_ITEM_SELECT = "*, found_item_details(*), found_item_private(*)";

export function toMatchable(i: TeamItem): MatchableItem & { id: string; ref_no: number } {
  return {
    id: i.id,
    ref_no: i.ref_no,
    category: i.category,
    found_at: i.found_at,
    public_label: i.public_label,
    title: i.found_item_details?.title,
    description: i.found_item_details?.description,
    color: i.found_item_details?.color,
    found_location: i.found_item_private?.found_location,
  };
}

/** Title the team sees: real title, else the public label. */
export const teamTitle = (i: TeamItem) => i.found_item_details?.title ?? i.public_label ?? "Untitled item";

export async function loadTeamItems(
  supabase: SupabaseClient,
  status?: "in_custody" | "claimed",
  { archived = false }: { archived?: boolean } = {},
) {
  let q = supabase.from("found_items").select(TEAM_ITEM_SELECT).order("found_at", { ascending: false }).limit(1000);
  if (status) q = q.eq("status", status);
  q = archived ? q.not("archived_at", "is", null) : q.is("archived_at", null);
  const { data } = await q.returns<TeamItem[]>();
  return data ?? [];
}

/** Timeline for an item or a report, oldest first. */
export async function loadActivity(supabase: SupabaseClient, by: { itemId: string } | { reportIds: string[] }) {
  let q = supabase.from("activity_log").select("*").order("created_at").order("id");
  q = "itemId" in by ? q.eq("item_id", by.itemId) : q.in("report_id", by.reportIds.length ? by.reportIds : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await q.returns<ActivityEntry[]>();
  return data ?? [];
}
