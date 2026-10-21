"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSuperadmin, requireTeam } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { EMAIL_RE, isSuperadminEmail } from "@/lib/team";
import { PHOTO_BUCKET } from "@/lib/photos";
import { claimSchema, firstError, formToObject, foundItemSchema, lostReportSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const UUID = /^[0-9a-f-]{36}$/i;

function revalidateAll(itemId?: string) {
  revalidatePath("/", "layout");
  if (itemId) revalidatePath(`/team/items/${itemId}`);
}

export async function saveFoundItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireTeam();
  const id = String(fd.get("id") ?? "");
  const parsed = foundItemSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const d = parsed.data;
  // Three tables by audience: public row, details (public once claimed), team-only.
  const publicRow = { public_label: d.public_label, category: d.category, ...(d.found_at ? { found_at: d.found_at } : {}) };
  const detailsRow = { title: d.title, description: d.description, color: d.color, photo_path: d.photo_path };
  const privateRow = {
    found_location: d.found_location,
    finder_name: d.finder_name,
    finder_contact: d.finder_contact,
    verification_details: d.verification_details,
    internal_notes: d.internal_notes,
  };

  const supabase = await createClient();
  let itemId = id;
  let oldPhoto: string | null = null;

  if (id) {
    if (!UUID.test(id)) return { error: "Invalid item" };
    const { data: before } = await supabase.from("found_item_details").select("photo_path").eq("item_id", id).maybeSingle();
    oldPhoto = before?.photo_path ?? null;
    const { error } = await supabase.from("found_items").update(publicRow).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
  } else {
    const { data, error } = await supabase.from("found_items").insert(publicRow).select("id").single();
    if (error || !data) return { error: `Couldn't save: ${error?.message ?? "unknown error"}` };
    itemId = data.id;
  }

  const [{ error: detErr }, { error: privErr }] = await Promise.all([
    supabase.from("found_item_details").upsert({ item_id: itemId, ...detailsRow }),
    supabase.from("found_item_private").upsert({ item_id: itemId, ...privateRow }),
  ]);
  if (detErr || privErr) return { error: `Item saved, but details failed: ${(detErr ?? privErr)!.message}` };

  if (oldPhoto && oldPhoto !== d.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([oldPhoto]);

  revalidateAll(itemId);
  redirect(`/team/items/${itemId}?saved=1`);
}

export async function deleteFoundItem(fd: FormData) {
  await requireTeam();
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { data: details } = await supabase.from("found_item_details").select("photo_path").eq("item_id", id).maybeSingle();
  // Details and private rows cascade with the item.
  await supabase.from("found_items").delete().eq("id", id);
  if (details?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([details.photo_path]);
  revalidateAll();
  redirect("/team/items");
}

export async function claimItem(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireTeam();
  const itemId = String(fd.get("item_id") ?? "");
  if (!UUID.test(itemId)) return { error: "Invalid item" };
  const parsed = claimSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_item", {
    p_item_id: itemId,
    p_claimant_name: parsed.data.claimant_name,
    p_claimant_contact: parsed.data.claimant_contact,
    p_claim_notes: parsed.data.claim_notes ?? null,
    p_lost_report_id: parsed.data.lost_report_id ?? null,
  });
  if (error) return { error: error.message };

  revalidateAll(itemId);
  return { ok: "Handed over. Item marked as returned." };
}

export async function unclaimItem(fd: FormData) {
  await requireTeam();
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  await supabase.rpc("unclaim_item", { p_item_id: id });
  revalidateAll(id);
}

/** File a new lost report (attendee at the desk) or save edits to one. */
export async function saveLostReport(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireTeam();
  const id = String(fd.get("id") ?? "");
  const parsed = lostReportSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  let reportId = id;
  if (id) {
    if (!UUID.test(id)) return { error: "Invalid report" };
    const { error } = await supabase.from("lost_reports").update(parsed.data).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
  } else {
    // filed_by is stamped by the database from the signed-in team member.
    const { data, error } = await supabase.from("lost_reports").insert(parsed.data).select("id, ref_no").single();
    if (error || !data) return { error: `Couldn't save: ${error?.message ?? "unknown error"}` };
    reportId = data.id;
  }

  revalidateAll();
  redirect(`/team/reports?status=all&saved=${reportId}#${reportId}`);
}

export async function linkReport(fd: FormData) {
  await requireTeam();
  const reportId = String(fd.get("report_id") ?? "");
  const itemId = String(fd.get("item_id") ?? "");
  const note = String(fd.get("team_note") ?? "").trim().slice(0, 1000);
  if (!UUID.test(reportId) || !UUID.test(itemId)) return;
  const supabase = await createClient();
  await supabase
    .from("lost_reports")
    .update({
      status: "matched",
      matched_item_id: itemId,
      team_note: note || "We may have found your item. Please come to the Info Desk to confirm it's yours.",
    })
    .eq("id", reportId);
  revalidateAll(itemId);
}

export async function unlinkReport(fd: FormData) {
  await requireTeam();
  const reportId = String(fd.get("report_id") ?? "");
  const supabase = await createClient();
  await supabase
    .from("lost_reports")
    .update({ status: "open", matched_item_id: null, team_note: null })
    .eq("id", reportId)
    .eq("status", "matched");
  revalidateAll();
}

export async function setReportStatus(fd: FormData) {
  await requireTeam();
  const reportId = String(fd.get("report_id") ?? "");
  const status = String(fd.get("status") ?? "");
  if (!["open", "closed"].includes(status)) return;
  const supabase = await createClient();
  await supabase.from("lost_reports").update({ status }).eq("id", reportId);
  revalidateAll();
}

export async function saveTeamNote(fd: FormData) {
  await requireTeam();
  const reportId = String(fd.get("report_id") ?? "");
  const note = String(fd.get("team_note") ?? "").trim().slice(0, 1000);
  const supabase = await createClient();
  await supabase.from("lost_reports").update({ team_note: note || null }).eq("id", reportId);
  revalidateAll();
}

// ---------------------------------------------------------------------------
// Team roster (superadmin only). Writes use the secret key because signed-in
// users have read-only access to team_members.
// ---------------------------------------------------------------------------

export async function addTeamMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await requireSuperadmin();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 200) return { error: "Enter a valid email address" };

  const { data, error } = await createAdminClient()
    .from("team_members")
    .upsert({ email, added_by: viewer.email }, { onConflict: "email", ignoreDuplicates: true })
    .select("email");
  if (error) return { error: `Couldn't add: ${error.message}` };

  revalidatePath("/team/members");
  return data?.length ? { ok: `Added ${email}. They get access next time they open the site.` } : { ok: `${email} is already on the team.` };
}

export async function removeTeamMember(fd: FormData) {
  await requireSuperadmin();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  // The superadmin's own row is re-created on their next visit anyway.
  if (!email || isSuperadminEmail(email)) return;
  await createAdminClient().from("team_members").delete().eq("email", email);
  revalidatePath("/team/members");
}
