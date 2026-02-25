import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireLabRole, validateInviteRole } from "@/lib/supabase/labs";

// GET: list lab members
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: labId } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: members } = await supabase
    .from("lab_members")
    .select("user_id, role, invited_email, joined_at")
    .eq("lab_id", labId);

  const { data: invitations } = await supabase
    .from("lab_invitations")
    .select("id, email, role, created_at, expires_at")
    .eq("lab_id", labId);

  return NextResponse.json({ members: members ?? [], invitations: invitations ?? [] });
}

// POST: invite a member by email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: labId } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id, ["owner", "admin"]);
  if (!role) {
    return NextResponse.json({ error: "Not authorized to invite" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { email, role: requestedRole = "member" } = body as { email?: string; role?: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Validate the requested role to prevent escalation (e.g. passing "owner")
  const validatedRole = validateInviteRole(requestedRole);
  if (!validatedRole) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Always create an invitation — the user joins when they sign up/log in.
  // If they already have an account the invitation is still resolved on next login.
  // Check if already a member by email
  const { data: existingMember } = await admin
    .from("lab_members")
    .select("user_id")
    .eq("lab_id", labId)
    .eq("invited_email", email.toLowerCase())
    .single();

  if (existingMember) {
    return NextResponse.json({ error: "Already a member" }, { status: 409 });
  }

  const { error } = await admin.from("lab_invitations").upsert(
    {
      lab_id: labId,
      email: email.toLowerCase(),
      role: validatedRole,
      invited_by: user.id,
    },
    { onConflict: "lab_id,email" }
  );

  if (error) {
    console.error("Failed to create invitation:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "invited", email }, { status: 201 });
}

// DELETE: remove a member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: labId } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { userId: targetUserId } = (await request.json().catch(() => ({}))) as {
    userId?: string;
  };
  if (!targetUserId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Can remove yourself, or owner/admin can remove others
  if (targetUserId !== user.id) {
    const role = await requireLabRole(supabase, labId, user.id, ["owner", "admin"]);
    if (!role) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }
  }

  // Don't allow removing the owner
  const { data: target } = await supabase
    .from("lab_members")
    .select("role")
    .eq("lab_id", labId)
    .eq("user_id", targetUserId)
    .single();

  if (target?.role === "owner") {
    return NextResponse.json({ error: "Cannot remove the lab owner" }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("lab_members")
    .delete()
    .eq("lab_id", labId)
    .eq("user_id", targetUserId);

  return NextResponse.json({ status: "removed" });
}
