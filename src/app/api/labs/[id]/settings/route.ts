import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { untyped } from "@/lib/supabase/untyped";

const VALID_PERMISSIONS = new Set([
  "create_collection",
  "post_announcement",
  "schedule_journal_club",
  "upload_files",
  "create_lab_notes",
]);

const MAX_LAB_NAME_LENGTH = 200;

function validateRolePermissions(
  perms: unknown
): perms is Record<string, Record<string, boolean>> {
  if (typeof perms !== "object" || perms === null) return false;
  const obj = perms as Record<string, unknown>;

  // Must have exactly admin and member keys
  const keys = Object.keys(obj);
  if (!keys.includes("admin") || !keys.includes("member")) return false;
  if (keys.some((k) => k !== "admin" && k !== "member")) return false;

  for (const role of ["admin", "member"]) {
    const rolePerms = obj[role];
    if (typeof rolePerms !== "object" || rolePerms === null) return false;
    for (const [key, value] of Object.entries(rolePerms as Record<string, unknown>)) {
      if (!VALID_PERMISSIONS.has(key)) return false;
      if (typeof value !== "boolean") return false;
    }
  }
  return true;
}

// GET: get lab settings (permissions, etc.)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: labId } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id, ["owner", "admin"]);
  if (!role) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { data: lab, error } = await untyped(supabase)
    .from("labs")
    .select("id, name, role_permissions")
    .eq("id", labId)
    .single();

  if (error || !lab) {
    return NextResponse.json({ error: "Lab not found" }, { status: 404 });
  }

  return NextResponse.json(lab);
}

// PATCH: update lab settings
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: labId } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id, ["owner", "admin"]);
  if (!role) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  const { name, role_permissions } = body as {
    name?: string;
    role_permissions?: unknown;
  };

  if (name !== undefined) {
    const trimmed = name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (trimmed.length > MAX_LAB_NAME_LENGTH) {
      return NextResponse.json({ error: `Name too long (max ${MAX_LAB_NAME_LENGTH} chars)` }, { status: 400 });
    }
    updates.name = trimmed;
  }

  if (role_permissions !== undefined) {
    // Only the owner can change permissions
    if (role !== "owner") {
      return NextResponse.json({ error: "Only the owner can change permissions" }, { status: 403 });
    }
    if (!validateRolePermissions(role_permissions)) {
      return NextResponse.json(
        { error: "Invalid role_permissions. Must have 'admin' and 'member' keys with known permission booleans." },
        { status: 400 }
      );
    }
    updates.role_permissions = role_permissions;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await untyped(supabase)
    .from("labs")
    .update(updates)
    .eq("id", labId)
    .select("id, name, role_permissions")
    .single();

  if (error) {
    console.error("Failed to update lab settings:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data);
}
