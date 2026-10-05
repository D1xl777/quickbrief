import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "creatives";
const TTL_SECONDS = 60 * 60;

/**
 * Creates short-lived signed URLs for private files. Call only AFTER the caller
 * has loaded the owning record through the RLS-protected client (that proves access).
 */
export async function signedUrls(paths: (string | null | undefined)[]) {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrls(unique, TTL_SECONDS);
  if (error) {
    console.error("Could not sign file URLs", error);
    return map;
  }
  for (const item of data) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}
