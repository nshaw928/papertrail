import type { SupabaseClient } from "@supabase/supabase-js";
import { untyped } from "@/lib/supabase/untyped";

/**
 * Verify a collection belongs to a lab. Returns the collection or null.
 */
export async function verifyCollectionOwnership(
  supabase: SupabaseClient,
  collectionId: string,
  labId: string
) {
  const { data } = await untyped(supabase)
    .from("lab_collections")
    .select("id, created_by")
    .eq("id", collectionId)
    .eq("lab_id", labId)
    .single();
  return data as { id: string; created_by: string } | null;
}

/**
 * Check if a user can write (add papers) to a lab collection.
 * Returns true if user is: creator, admin/owner, or on the contributors list.
 * The collection must belong to the specified lab.
 */
export async function hasLabCollectionWriteAccess(
  supabase: SupabaseClient,
  collectionId: string,
  labId: string,
  userId: string,
  userRole: string
): Promise<boolean> {
  // Verify collection belongs to this lab first
  const collection = await verifyCollectionOwnership(supabase, collectionId, labId);
  if (!collection) return false;

  if (userRole === "owner" || userRole === "admin") return true;
  if (collection.created_by === userId) return true;

  // Check if user is on the contributors list
  const { data: contributor } = await untyped(supabase)
    .from("lab_collection_contributors")
    .select("user_id")
    .eq("lab_collection_id", collectionId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!contributor;
}
