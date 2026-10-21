import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamItem } from "@/lib/types";
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

export async function loadTeamItems(supabase: SupabaseClient, status?: "in_custody" | "claimed") {
  let q = supabase.from("found_items").select(TEAM_ITEM_SELECT).order("found_at", { ascending: false }).limit(1000);
  if (status) q = q.eq("status", status);
  const { data } = await q.returns<TeamItem[]>();
  return data ?? [];
}
