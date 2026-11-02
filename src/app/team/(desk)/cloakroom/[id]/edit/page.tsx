import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signPhotoUrls } from "@/lib/photos";
import { depositRef } from "@/lib/format";
import type { CloakDeposit } from "@/lib/types";
import { DepositForm } from "@/components/deposit-form";

export const metadata: Metadata = { title: "Edit deposit" };

export default async function EditDepositPage({ params }: PageProps<"/team/cloakroom/[id]/edit">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: deposit } = await supabase.from("cloak_deposits").select("*").eq("id", id).maybeSingle<CloakDeposit>();
  if (!deposit || deposit.archived_at) notFound();
  const photoUrls = await signPhotoUrls(supabase, [...deposit.bag_photo_paths, deposit.token_photo_path]);

  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">{depositRef(deposit.ref_no)}</p>
      <h1 className="mt-1 text-3xl font-extrabold">Edit deposit</h1>
      <p className="mt-2 text-sm text-muted">Saved photos are kept. You can add more.</p>
      <div className="mt-6">
        <DepositForm deposit={deposit} photoUrls={photoUrls} />
      </div>
    </div>
  );
}
