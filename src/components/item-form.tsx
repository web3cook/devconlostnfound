"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/config";
import { compressImage } from "@/lib/image";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime-client";
import { createClient } from "@/lib/supabase/client";
import type { ActionState, FoundItem, FoundItemPrivate } from "@/lib/types";
import { saveFoundItem } from "@/app/team/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

type Props = {
  item?: FoundItem;
  details?: FoundItemPrivate | null;
  photoUrl?: string;
};

export function ItemForm({ item, details, photoUrl }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(photoUrl);
  const [photoPath, setPhotoPath] = useState(item?.photo_path ?? "");
  const [foundAt, setFoundAt] = useState("");

  // Default "found at" to now, in the device's zone (client-only to avoid hydration mismatch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFoundAt(isoToLocalInput(item?.found_at ?? new Date().toISOString()));
  }, [item?.found_at]);

  const [state, action] = useActionState(async (prev: ActionState, fd: FormData): Promise<ActionState> => {
    const file = fileRef.current?.files?.[0];
    if (file) {
      try {
        const blob = await compressImage(file);
        const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
        const { error } = await createClient()
          .storage.from("item-photos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (error) return { error: `Photo upload failed: ${error.message}` };
        fd.set("photo_path", path);
        setPhotoPath(path);
        if (fileRef.current) fileRef.current.value = "";
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Couldn't process the photo" };
      }
    }
    localInputToIso(fd, "found_at");
    return saveFoundItem(prev, fd);
  }, undefined);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPreview(URL.createObjectURL(f));
  }

  function removePhoto() {
    setPreview(undefined);
    setPhotoPath("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form action={action} className="space-y-6">
      {item && <input type="hidden" name="id" value={item.id} />}
      <input type="hidden" name="photo_path" value={photoPath} />

      <section className="card p-6">
        <h2 className="text-lg font-bold">Photo</h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <label className="relative grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-brand/30 bg-lavender text-center hover:border-brand sm:w-72">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Item preview" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="px-6 text-sm text-muted">
                <span className="block text-4xl">📷</span>
                Tap to take a photo or choose one
              </span>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onPick}
              className="sr-only"
              aria-label="Item photo"
            />
          </label>
          <div className="space-y-3 text-sm">
            {preview && (
              <button type="button" onClick={removePhoto} className="btn-ghost btn-sm text-red-600">
                Remove photo
              </button>
            )}
            <label className="flex items-start gap-3">
              <input type="checkbox" name="photo_public" defaultChecked={item?.photo_public ?? true} className="mt-1 h-4 w-4 accent-brand" />
              <span>
                <span className="font-semibold text-ink">Show photo publicly</span>
                <span className="block text-muted">
                  Untick for wallets, IDs, cards or anything where the photo gives away details a real owner should describe.
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="text-lg font-bold">Public details</h2>
        <p className="-mt-3 text-sm text-muted">Shown to everyone on the found items list.</p>
        <div>
          <label className="label" htmlFor="title">Item</label>
          <input id="title" name="title" required maxLength={120} defaultValue={item?.title} className="input" placeholder="e.g. Silver MacBook Air" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" defaultValue={item?.category ?? "other"} className="input">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="color">Colour</label>
            <input id="color" name="color" maxLength={60} defaultValue={item?.color ?? ""} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={item?.description ?? ""} className="input" placeholder="General description. Keep identifying details for the private field below." />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="found_location">Where it was found</label>
            <input id="found_location" name="found_location" maxLength={200} defaultValue={item?.found_location ?? ""} className="input" placeholder="e.g. Green Pavilion, Meeting room 10" />
          </div>
          <div>
            <label className="label" htmlFor="found_at">When it was found</label>
            <input id="found_at" name="found_at" type="datetime-local" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} className="input" />
          </div>
        </div>
      </section>

      <section className="card space-y-5 border-amber-200 bg-amber-50/60 p-6">
        <h2 className="text-lg font-bold">🔒 Team only</h2>
        <p className="-mt-3 text-sm text-muted">Never shown publicly.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="finder_name">Handed in by</label>
            <input id="finder_name" name="finder_name" maxLength={120} defaultValue={details?.finder_name ?? ""} className="input" placeholder="Name" />
          </div>
          <div>
            <label className="label" htmlFor="finder_contact">Finder&apos;s contact</label>
            <input id="finder_contact" name="finder_contact" maxLength={200} defaultValue={details?.finder_contact ?? ""} className="input" placeholder="@telegram, phone or email" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="verification_details">Identifying details (for verifying claims)</label>
          <textarea id="verification_details" name="verification_details" rows={3} maxLength={2000} defaultValue={details?.verification_details ?? ""} className="input" placeholder="Lock-screen wallpaper, stickers, engraving, contents, card name… Ask the claimant to describe these." />
        </div>
        <div>
          <label className="label" htmlFor="internal_notes">Internal notes</label>
          <textarea id="internal_notes" name="internal_notes" rows={2} maxLength={2000} defaultValue={details?.internal_notes ?? ""} className="input" placeholder="e.g. Stored in locker B, shelf 2" />
        </div>
      </section>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">{item ? "Save changes" : "Log item"}</SubmitButton>
      </div>
    </form>
  );
}
