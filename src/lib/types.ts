export type ItemStatus = "in_custody" | "claimed";
export type ReportStatus = "open" | "matched" | "returned" | "closed";

export type FoundItem = {
  id: string;
  ref_no: number;
  title: string;
  description: string | null;
  category: string;
  color: string | null;
  found_location: string | null;
  found_at: string;
  photo_path: string | null;
  photo_public: boolean;
  status: ItemStatus;
  claimed_at: string | null;
  created_at: string;
};

export type FoundItemPrivate = {
  item_id: string;
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
