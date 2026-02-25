import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Check if a user has the required role in a lab.
 * Returns the user's role if they have one of the required roles, or null otherwise.
 */
export async function requireLabRole(
  supabase: SupabaseClient,
  labId: string,
  userId: string,
  roles?: ("owner" | "admin" | "member")[]
): Promise<string | null> {
  const { data: membership } = await supabase
    .from("lab_members")
    .select("role")
    .eq("lab_id", labId)
    .eq("user_id", userId)
    .single();

  if (!membership) return null;
  if (roles && !roles.includes(membership.role as "owner" | "admin" | "member")) return null;
  return membership.role;
}

/**
 * Get a user's lab membership, if any.
 */
export async function getUserLab(
  supabase: SupabaseClient,
  userId: string
): Promise<{ lab_id: string; lab_name: string; role: string } | null> {
  const { data: membership } = await supabase
    .from("lab_members")
    .select("lab_id, role")
    .eq("user_id", userId)
    .limit(1)
    .single();

  if (!membership) return null;

  const { data: lab } = await supabase
    .from("labs")
    .select("name")
    .eq("id", membership.lab_id)
    .single();

  return {
    lab_id: membership.lab_id,
    lab_name: lab?.name ?? "",
    role: membership.role,
  };
}

/**
 * Load shared collections for a lab, with collection details fetched separately
 * to avoid `as unknown as` casts from Supabase joins.
 */
export async function loadLabCollections(
  supabase: SupabaseClient,
  labId: string
): Promise<{ id: string; name: string; user_id: string; pinned: boolean }[]> {
  const { data: sharedRaw } = await supabase
    .from("lab_collections")
    .select("collection_id, pinned")
    .eq("lab_id", labId) as { data: { collection_id: string; pinned: boolean | null }[] | null };

  const collectionIds = (sharedRaw ?? []).map((sc) => sc.collection_id);
  if (collectionIds.length === 0) return [];

  const { data: details } = await supabase
    .from("collections")
    .select("id, name, user_id")
    .in("id", collectionIds);

  const detailMap = new Map(
    (details ?? []).map((c) => [c.id, c])
  );

  return (sharedRaw ?? [])
    .map((sc) => {
      const c = detailMap.get(sc.collection_id);
      if (!c) return null;
      return { id: c.id, name: c.name, user_id: c.user_id, pinned: sc.pinned ?? false };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
}

const VALID_INVITE_ROLES = ["member", "admin"] as const;
type InviteRole = (typeof VALID_INVITE_ROLES)[number];

/**
 * Validate that a role string is an allowed invite role (member or admin).
 * Prevents privilege escalation — callers cannot assign "owner" via invite.
 */
export function validateInviteRole(role: string): InviteRole | null {
  if ((VALID_INVITE_ROLES as readonly string[]).includes(role)) {
    return role as InviteRole;
  }
  return null;
}
