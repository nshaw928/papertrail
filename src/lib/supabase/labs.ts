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
