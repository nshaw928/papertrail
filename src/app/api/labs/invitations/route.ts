import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET: list pending invitations for the current user
export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Fetch invitations separately from labs to avoid join cast
  const { data: invitations } = await supabase
    .from("lab_invitations")
    .select("id, lab_id, email, role, created_at, expires_at")
    .eq("email", user.email!.toLowerCase())
    .gt("expires_at", new Date().toISOString());

  const labIds = [...new Set((invitations ?? []).map((inv) => inv.lab_id))];
  const { data: labs } = labIds.length > 0
    ? await supabase.from("labs").select("id, name").in("id", labIds)
    : { data: [] as { id: string; name: string }[] };

  const labMap = new Map((labs ?? []).map((l) => [l.id, l.name]));

  const result = (invitations ?? []).map((inv) => ({
    id: inv.id,
    lab_id: inv.lab_id,
    lab_name: labMap.get(inv.lab_id) ?? "",
    email: inv.email,
    role: inv.role,
    created_at: inv.created_at,
    expires_at: inv.expires_at,
  }));

  return NextResponse.json(result);
}

// POST: accept an invitation
export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => ({}));
  const { invitationId } = body as { invitationId?: string };
  if (!invitationId) {
    return NextResponse.json({ error: "invitationId required" }, { status: 400 });
  }

  // Fetch and validate invitation
  const { data: invitation } = await supabase
    .from("lab_invitations")
    .select("*")
    .eq("id", invitationId)
    .eq("email", user.email!.toLowerCase())
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!invitation) {
    return NextResponse.json({ error: "Invitation not found or expired" }, { status: 404 });
  }

  const admin = createAdminClient();

  // Add as lab member
  const { error: memberError } = await admin.from("lab_members").upsert(
    {
      lab_id: invitation.lab_id,
      user_id: user.id,
      role: invitation.role,
      invited_by: invitation.invited_by,
      invited_email: invitation.email,
      joined_at: new Date().toISOString(),
    },
    { onConflict: "lab_id,user_id" }
  );

  if (memberError) {
    console.error("Failed to add lab member:", memberError.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Delete the invitation
  await admin
    .from("lab_invitations")
    .delete()
    .eq("id", invitationId);

  return NextResponse.json({ status: "joined", lab_id: invitation.lab_id });
}
