import type { SupabaseClient } from "@supabase/supabase-js";

export const PHOTO_BUCKET = "item-photos";

/**
 * Signed URLs for item photos. Storage RLS decides what the caller may see:
 * the public only gets photos marked public, the team gets all of them.
 */
export async function signPhotoUrls(
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return {};
  const { data } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(unique, 60 * 60);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl && !row.error) out[row.path] = row.signedUrl;
  }
  return out;
}
