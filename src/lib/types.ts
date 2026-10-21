export type ItemStatus = "in_custody" | "claimed";
export type ReportStatus = "open" | "matched" | "returned" | "closed";

/** Public row. While in custody this is all anyone outside the team can see. */
export type FoundItem = {
  id: string;
  ref_no: number;
  public_label: string | null;
  category: string;
  found_at: string;
  status: ItemStatus;
  claimed_at: string | null;
  created_at: string;
};

/** Real description. Team always; public only once the item is claimed (RLS). */
export type FoundItemDetails = {
  item_id: string;
  title: string;
  description: string | null;
  color: string | null;
  photo_path: string | null;
};

/** Found item with every detail. Only fully populated for team sessions (RLS). */
export type TeamItem = FoundItem & {
  found_item_details: FoundItemDetails | null;
  found_item_private: FoundItemPrivate | null;
};

/** A found item with whatever details the viewer is allowed to see. */
export type FoundItemWithDetails = FoundItem & { found_item_details: FoundItemDetails | null };

export type FoundItemPrivate = {
  item_id: string;
  found_location: string | null;
  finder_name: string | null;
  finder_contact: string | null;
  verification_details: string | null;
  internal_notes: string | null;
  claimant_name: string | null;
  claimant_contact: string | null;
  claim_notes: string | null;
  claimed_by_team: string | null;
};

export type LostReport = {
  id: string;
  ref_no: number;
  user_id: string;
  title: string;
  description: string;
  category: string;
  color: string | null;
  lost_location: string | null;
  lost_at: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_telegram: string | null;
  contact_phone: string | null;
  status: ReportStatus;
  matched_item_id: string | null;
  team_note: string | null;
  created_at: string;
};

export type ActionState = { error?: string; ok?: string } | undefined;
