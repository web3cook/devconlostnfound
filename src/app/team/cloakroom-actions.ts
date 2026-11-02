"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireTeam } from "@/lib/auth";
import { depositRef } from "@/lib/format";
import { collectSchema, depositSchema, firstError, formToObject } from "@/lib/validation";
import type { ActionState } from "@/lib/types";

const UUID = /^[0-9a-f-]{36}$/i;

/** Check bags in, or save edits to a deposit. */
export async function saveDeposit(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireTeam();
  const id = String(fd.get("id") ?? "");
  const parsed = depositSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const { deposited_at, ...rest } = parsed.data;
  const row = { ...rest, ...(deposited_at ? { deposited_at } : {}) };
  const supabase = await createClient();

  const result = id
    ? UUID.test(id)
      ? await supabase.from("cloak_deposits").update(row).eq("id", id).select("id").single()
      : null
    : await supabase.from("cloak_deposits").insert(row).select("id").single();
  if (!result) return { error: "Invalid deposit" };

  if (result.error) {
    // Unique index: the physical token is already on a deposit still in storage.
    if (result.error.code === "23505") {
      const { data: clash } = await supabase
        .from("cloak_deposits")
        .select("ref_no, depositor_name")
        .eq("token_no", row.token_no)
        .eq("status", "stored")
        .is("archived_at", null)
        .maybeSingle();
      return {
        error: `Token ${row.token_no} is already in use${clash ? ` on ${depositRef(clash.ref_no)} (${clash.depositor_name})` : ""}, which hasn't been collected yet. Use a different token.`,
      };
    }
    return { error: `Couldn't save: ${result.error.message}` };
  }

  revalidatePath("/team", "layout");
  redirect(`/team/cloakroom/${result.data.id}?saved=1`);
}

/** Hand the bags back to whoever presents the token. */
export async function collectDeposit(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireTeam();
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return { error: "Invalid deposit" };
  const parsed = collectSchema.safeParse(formToObject(fd));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc("collect_deposit", {
    p_deposit_id: id,
    p_token_no: d.token_no,
    p_name: d.collector_name,
    p_phone: d.collector_phone ?? "",
    p_telegram: d.collector_telegram ?? "",
    p_email: d.collector_email ?? "",
    p_notes: d.collection_notes ?? "",
  });
  if (error) return { error: error.message };

  revalidatePath("/team", "layout");
  return { ok: "Bags handed back. Take the token back for reuse." };
}

export async function uncollectDeposit(fd: FormData) {
  await requireTeam();
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("uncollect_deposit", { p_deposit_id: id });
  if (error) {
    throw new Error(
      error.code === "23505"
        ? "Can't undo: this token has already been given to another deposit."
        : `Couldn't undo: ${error.message}`,
    );
  }
  revalidatePath("/team", "layout");
}
