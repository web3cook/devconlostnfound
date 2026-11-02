"use client";

import { useEffect, useRef, useState } from "react";

export type PickedPhotos = { existing: string[]; files: File[] };

/**
 * Camera-first photo picker. Existing photos (already saved) are shown but kept,
 * so the record is never lost; new shots can be added or removed before saving.
 */
export function PhotoPicker({
  label,
  hint,
  multiple = false,
  existing,
  existingUrls,
  onChange,
}: {
  label: string;
  hint?: string;
  multiple?: boolean;
  existing: string[];
  existingUrls: Record<string, string>;
  onChange: (p: PickedPhotos) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

  function update(next: File[]) {
    setFiles(next);
    onChange({ existing, files: next });
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (picked.length) update(multiple ? [...files, ...picked] : picked.slice(0, 1));
    e.target.value = "";
  }

  const canAdd = multiple || (existing.length === 0 && files.length === 0);

  return (
    <div>
      <p className="label">{label}</p>
      <div className="flex flex-wrap gap-3">
        {existing.map((p) => (
          <div key={p} className="h-24 w-28 overflow-hidden rounded-xl ring-1 ring-line">
            {existingUrls[p] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={existingUrls[p]} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center bg-lavender text-xs text-muted">Saved</div>
            )}
          </div>
        ))}
        {previews.map((url, i) => (
          <div key={url} className="relative h-24 w-28 overflow-hidden rounded-xl ring-2 ring-brand/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => update(files.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full bg-night/80 text-xs text-white"
              aria-label="Remove photo"
            >
              ✕
            </button>
          </div>
        ))}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="grid h-24 w-28 place-items-center rounded-xl border-2 border-dashed border-brand/30 bg-white text-center text-xs text-muted hover:border-brand"
          >
            <span>
              <span className="block text-2xl">📷</span>
              {existing.length + files.length ? "Add another" : "Take photo"}
            </span>
          </button>
        )}
      </div>
      {!multiple && !canAdd && files.length > 0 && (
        <button type="button" onClick={() => update([])} className="btn-ghost btn-sm mt-2">
          Retake
        </button>
      )}
      {hint && <p className="hint">{hint}</p>}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" multiple={multiple} onChange={onPick} className="sr-only" aria-label={label} />
    </div>
  );
}
