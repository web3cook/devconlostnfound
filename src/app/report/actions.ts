"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { firstError, formToObject, lostReportSchema } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

export async function createLostReport(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Please sign in again." };

  const parsed = lostReportSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.from("lost_reports").insert({ ...parsed.data, user_id: viewer.id });
  if (error) return { error: "Couldn't save your report. Please try again." };

  revalidatePath("/my-reports");
  redirect("/my-reports?created=1");
}

export async function closeLostReport(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  // RLS limits this to the owner; the DB trigger only lets owners set 'closed'.
  await supabase.from("lost_reports").update({ status: "closed" }).eq("id", id);
  revalidatePath("/my-reports");
}

export async function reopenLostReport(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("lost_reports").update({ status: "open" }).eq("id", id).eq("status", "closed");
  revalidatePath("/my-reports");
}

export async function deleteLostReport(fd: FormData) {
  const id = String(fd.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("lost_reports").delete().eq("id", id);
  revalidatePath("/my-reports");
}
