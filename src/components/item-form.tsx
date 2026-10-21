"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CATEGORIES, categoryMeta } from "@/lib/config";
import { compressImage } from "@/lib/image";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime-client";
import { createClient } from "@/lib/supabase/client";
import type { ActionState, TeamItem } from "@/lib/types";
import { saveFoundItem } from "@/app/team/actions";
import { FormMessage, SubmitButton } from "@/components/form-bits";

export function ItemForm({ item, photoUrl }: { item?: TeamItem; photoUrl?: string }) {
  const details = item?.found_item_details;
  const priv = item?.found_item_private;

  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(photoUrl);
  const [photoPath, setPhotoPath] = useState(details?.photo_path ?? "");
  const [foundAt, setFoundAt] = useState("");
  const [label, setLabel] = useState(item?.public_label ?? "");
  const [category, setCategory] = useState(item?.category ?? "other");

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

      <section className="card space-y-5 p-6">
        <div>
          <h2 className="text-lg font-bold">Public listing</h2>
          <p className="text-sm text-muted">
            The only thing attendees see until the item is returned. Keep it generic so the owner has to describe it.
          </p>
        </div>
        <div>
          <label className="label" htmlFor="public_label">Generic label</label>
          <input
            id="public_label"
            name="public_label"
            maxLength={80}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input"
            placeholder="e.g. Water bottle, 1 L · Backpack · Laptop · Earbuds"
          />
          <p className="hint">No colour, brand, stickers or contents. Leave blank to show the category name.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="category">Category</label>
            <select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.emoji} {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="found_at">When it was found</label>
            <input id="found_at" name="found_at" type="datetime-local" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} className="input" />
          </div>
        </div>
        <p className="rounded-xl bg-lavender px-4 py-3 text-sm">
          <span className="text-muted">Public will see: </span>
          <strong className="text-ink">
            {categoryMeta(category).emoji} {label.trim() || categoryMeta(category).label}
          </strong>
          <span className="text-muted"> · no photo, description or location</span>
        </p>
      </section>

      <section className="card space-y-5 border-amber-200 bg-amber-50/60 p-6">
        <div>
          <h2 className="text-lg font-bold">🔒 Full details (team only)</h2>
          <p className="text-sm text-muted">
            Use these to check a claimant&apos;s description. The photo, title, colour and description become public only after
            the item is returned.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <label className="relative grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-brand/30 bg-white text-center hover:border-brand sm:w-72">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Item preview" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <span className="px-6 text-sm text-muted">
                <span className="block text-4xl">📷</span>
                Tap to take a photo or choose one
              </span>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onPick} className="sr-only" aria-label="Item photo" />
          </label>
          {preview && (
            <button type="button" onClick={removePhoto} className="btn-ghost btn-sm text-red-600">
              Remove photo
            </button>
          )}
        </div>

        <div>
          <label className="label" htmlFor="title">Item</label>
          <input id="title" name="title" required maxLength={120} defaultValue={details?.title} className="input" placeholder="e.g. Black Milton steel bottle with Devcon sticker" />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="color">Colour</label>
            <input id="color" name="color" maxLength={60} defaultValue={details?.color ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="found_location">Where it was found</label>
            <input id="found_location" name="found_location" maxLength={200} defaultValue={priv?.found_location ?? ""} className="input" placeholder="e.g. Green Pavilion, meeting room 10" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={details?.description ?? ""} className="input" placeholder="Brand, condition, what's inside the bag…" />
        </div>
        <div>
          <label className="label" htmlFor="verification_details">Identifying details (never public)</label>
          <textarea id="verification_details" name="verification_details" rows={2} maxLength={2000} defaultValue={priv?.verification_details ?? ""} className="input" placeholder="Lock-screen wallpaper, engraving, name on a card… Ask the claimant before revealing anything." />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="finder_name">Handed in by</label>
            <input id="finder_name" name="finder_name" maxLength={120} defaultValue={priv?.finder_name ?? ""} className="input" placeholder="Name" />
          </div>
          <div>
            <label className="label" htmlFor="finder_contact">Finder&apos;s contact</label>
            <input id="finder_contact" name="finder_contact" maxLength={200} defaultValue={priv?.finder_contact ?? ""} className="input" placeholder="@telegram, phone or email" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="internal_notes">Internal notes</label>
          <textarea id="internal_notes" name="internal_notes" rows={2} maxLength={2000} defaultValue={priv?.internal_notes ?? ""} className="input" placeholder="e.g. Stored in locker B, shelf 2" />
        </div>
      </section>

      <FormMessage state={state} />
      <div className="flex justify-end">
        <SubmitButton pendingText="Saving…">{item ? "Save changes" : "Log item"}</SubmitButton>
      </div>
    </form>
  );
}
