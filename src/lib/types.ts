export type ItemStatus = "in_custody" | "claimed";
export type ReportStatus = "open" | "matched" | "returned" | "closed";

/** Public row: all anyone outside the team ever sees (archived rows are hidden from them). */
export type FoundItem = {
  id: string;
  ref_no: number;
  public_label: string | null;
  category: string;
  found_at: string;
  status: ItemStatus;
  claimed_at: string | null;
  created_at: string;
  /** "Name (email)" stamped by the database. */
  logged_by: string | null;
  updated_by: string | null;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
};

/** Real description. Team only (RLS). */
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

export type FoundItemPrivate = {
  item_id: string;
  found_location: string | null;
  finder_name: string | null;
  finder_phone: string | null;
  finder_email: string | null;
  /** Free-text "other contact" (Telegram etc.). */
  finder_contact: string | null;
  verification_details: string | null;
  internal_notes: string | null;
  claimant_name: string | null;
  claimant_phone: string | null;
  claimant_email: string | null;
  /** Free-text "other contact" (Telegram etc.). */
  claimant_contact: string | null;
  claim_notes: string | null;
  /** "Name (email)" of the team member who handed it over. */
  claimed_by_team: string | null;
};

export type LostReport = {
  id: string;
  ref_no: number;
  /** Legacy: account that reported it online, before reports moved to the desk. */
  user_id: string | null;
  /** "Name (email)" of the team member who filed it (set by the database). */
  filed_by: string | null;
  updated_by: string | null;
  updated_at: string;
  archived_at: string | null;
  archived_by: string | null;
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

/** One entry in an item's or report's timeline. Written only by database triggers. */
export type ActivityEntry = {
  id: number;
  item_id: string | null;
  report_id: string | null;
  action: string;
  summary: string | null;
  actor: string | null;
  created_at: string;
};
