import { compressImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

/** Compress in the browser and upload to the team-only photo bucket. Returns the storage path. */
export async function uploadPhoto(file: File, folder: string): Promise<string> {
  const blob = await compressImage(file);
  const path = `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
  const { error } = await createClient()
    .storage.from("item-photos")
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}
