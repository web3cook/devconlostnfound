"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime-client";
import { uploadPhoto } from "@/lib/upload-client";
import type { ActionState, CloakDeposit } from "@/lib/types";
import { saveDeposit } from "@/app/team/cloakroom-actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";
import { PhotoPicker, type PickedPhotos } from "@/components/photo-picker";

/** Team-only: check bags into the cloakroom, or edit a deposit. */
export function DepositForm({ deposit, photoUrls = {} }: { deposit?: CloakDeposit; photoUrls?: Record<string, string> }) {
  const bags = useRef<PickedPhotos>({ existing: deposit?.bag_photo_paths ?? [], files: [] });
  const token = useRef<PickedPhotos>({ existing: deposit?.token_photo_path ? [deposit.token_photo_path] : [], files: [] });

  // Device-zone time, filled in the browser (the server may run in UTC).
  const [depositedAt, setDepositedAt] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDepositedAt(isoToLocalInput(deposit?.deposited_at ?? new Date().toISOString()));
  }, [deposit?.deposited_at]);

  const [state, action] = useActionState(async (prev: ActionState, fd: FormData): Promise<ActionState> => {
    const b = bags.current;
    const t = token.current;
    if (b.existing.length + b.files.length === 0) return { error: "Take at least one photo of the bags" };
    if (t.existing.length + t.files.length === 0) return { error: "Take a photo of the token" };
    try {
      const newBagPaths = await Promise.all(b.files.map((f) => uploadPhoto(f, "cloakroom")));
      const tokenPath = t.files[0] ? await uploadPhoto(t.files[0], "cloakroom") : t.existing[0];
      fd.set("bag_photo_paths", JSON.stringify([...b.existing, ...newBagPaths]));
      fd.set("token_photo_path", tokenPath);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't upload photos" };
    }
    localInputToIso(fd, "deposited_at");
    return saveDeposit(prev, fd);
  }, undefined);

  return (
    <form action={action} className="space-y-6">
      {deposit && <input type="hidden" name="id" value={deposit.id} />}

      <section className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">Token &amp; bags</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="token_no">Token number</label>
            <input
              id="token_no"
              name="token_no"
              required
              maxLength={20}
              defaultValue={deposit?.token_no}
              autoCapitalize="characters"
              className="input font-mono text-lg uppercase placeholder:normal-case"
              placeholder="e.g. 042"
            />
          </div>
          <div>
            <label className="label" htmlFor="bag_count">Number of bags</label>
            <input id="bag_count" name="bag_count" type="number" required min={1} max={50} defaultValue={deposit?.bag_count ?? 1} className="input text-lg" />
          </div>
          <div>
            <label className="label" htmlFor="deposited_at">Date &amp; time</label>
            <input id="deposited_at" name="deposited_at" type="datetime-local" value={depositedAt} onChange={(e) => setDepositedAt(e.target.value)} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="bag_description">Bag description</label>
          <input id="bag_description" name="bag_description" maxLength={1000} defaultValue={deposit?.bag_description ?? ""} className="input" placeholder="e.g. Black Samsonite trolley + grey laptop backpack" />
        </div>
        <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
          <PhotoPicker
            label="Bag photos (required)"
            hint="One or more. Get every bag in shot, with any tags."
            multiple
            existing={deposit?.bag_photo_paths ?? []}
            existingUrls={photoUrls}
            onChange={(p) => (bags.current = p)}
          />
          <PhotoPicker
            label="Token photo (required)"
            existing={deposit?.token_photo_path ? [deposit.token_photo_path] : []}
            existingUrls={photoUrls}
            onChange={(p) => (token.current = p)}
          />
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">Depositor</h2>
        <p className="-mt-3 text-sm text-muted">Name plus at least one way to reach them. Only the team sees this.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="depositor_name">Name</label>
            <input id="depositor_name" name="depositor_name" required maxLength={120} defaultValue={deposit?.depositor_name} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="depositor_phone">Phone / WhatsApp</label>
            <input id="depositor_phone" name="depositor_phone" type="tel" maxLength={40} defaultValue={deposit?.depositor_phone ?? ""} className="input" placeholder="+91 …" />
          </div>
          <div>
            <label className="label" htmlFor="depositor_telegram">Telegram</label>
            <input id="depositor_telegram" name="depositor_telegram" maxLength={100} defaultValue={deposit?.depositor_telegram ?? ""} className="input" placeholder="@username" />
          </div>
          <div>
            <label className="label" htmlFor="depositor_email">Email</label>
            <input id="depositor_email" name="depositor_email" type="email" maxLength={200} defaultValue={deposit?.depositor_email ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="notes">Notes</label>
          <textarea id="notes" name="notes" rows={2} maxLength={2000} defaultValue={deposit?.notes ?? ""} className="input" placeholder="e.g. Fragile, picking up after the closing ceremony" />
        </div>
      </section>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">{deposit ? "Save changes" : "Check in bags"}</SubmitButton>
      </div>
    </form>
  );
}
