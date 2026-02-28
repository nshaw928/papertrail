import type { SupabaseClient } from "@supabase/supabase-js";
import { requireLabRole } from "@/lib/supabase/labs";
import { untyped } from "@/lib/supabase/untyped";

export type LabPermission =
  | "create_collection"
  | "post_announcement"
  | "schedule_journal_club"
  | "upload_files"
  | "create_lab_notes";

const DEFAULTS: Record<string, Record<LabPermission, boolean>> = {
  admin: {
    create_collection: true,
    post_announcement: true,
    schedule_journal_club: true,
    upload_files: true,
    create_lab_notes: true,
  },
  member: {
    create_collection: false,
    post_announcement: true,
    schedule_journal_club: false,
    upload_files: true,
    create_lab_notes: true,
  },
};

/**
 * Check if a user has a specific permission in a lab.
 * Owner always has all permissions.
 * Admins and members check lab's role_permissions JSONB, falling back to defaults.
 */
export async function hasLabPermission(
  supabase: SupabaseClient,
  labId: string,
  userId: string,
  permission: LabPermission
): Promise<boolean> {
  const role = await requireLabRole(supabase, labId, userId);
  if (!role) return false;
  if (role === "owner") return true;

  const { data: lab } = await untyped(supabase)
    .from("labs")
    .select("role_permissions")
    .eq("id", labId)
    .single();

  const perms = lab?.role_permissions as Record<string, Record<string, boolean>> | null;
  return perms?.[role]?.[permission] ?? DEFAULTS[role]?.[permission] ?? false;
}

/**
 * Get all permissions for a role in a lab.
 */
export async function getLabPermissions(
  supabase: SupabaseClient,
  labId: string
): Promise<Record<string, Record<LabPermission, boolean>>> {
  const { data: lab } = await untyped(supabase)
    .from("labs")
    .select("role_permissions")
    .eq("id", labId)
    .single();

  const perms = lab?.role_permissions as Record<string, Record<LabPermission, boolean>> | null;

  return {
    admin: { ...DEFAULTS.admin, ...perms?.admin },
    member: { ...DEFAULTS.member, ...perms?.member },
  };
}
