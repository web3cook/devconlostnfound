"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTeam } from "@/lib/auth";
import { PHOTO_BUCKET } from "@/lib/photos";
import { claimSchema, firstError, formToObject, foundItemSchema } from "@/lib/validation";
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

  const { finder_name, finder_contact, verification_details, internal_notes, found_at, ...item } = parsed.data;
  const supabase = await createClient();
  let itemId = id;

  if (id) {
    if (!UUID.test(id)) return { error: "Invalid item" };
    const { data: before } = await supabase.from("found_items").select("photo_path").eq("id", id).single();
    const { error } = await supabase
      .from("found_items")
      .update({ ...item, ...(found_at ? { found_at } : {}) })
      .eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
    if (before?.photo_path && before.photo_path !== item.photo_path) {
      await supabase.storage.from(PHOTO_BUCKET).remove([before.photo_path]);
    }
  } else {
    const { data, error } = await supabase
      .from("found_items")
      .insert({ ...item, ...(found_at ? { found_at } : {}) })
      .select("id")
      .single();
    if (error || !data) return { error: `Couldn't save: ${error?.message ?? "unknown error"}` };
    itemId = data.id;
  }

  const { error: privErr } = await supabase
    .from("found_item_private")
    .upsert({ item_id: itemId, finder_name, finder_contact, verification_details, internal_notes });
  if (privErr) return { error: `Item saved, but team details failed: ${privErr.message}` };

  revalidateAll(itemId);
  redirect(`/team/items/${itemId}?saved=1`);
}

export async function deleteFoundItem(fd: FormData) {
  await requireTeam();
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { data } = await supabase.from("found_items").delete().eq("id", id).select("photo_path").single();
  if (data?.photo_path) await supabase.storage.from(PHOTO_BUCKET).remove([data.photo_path]);
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
