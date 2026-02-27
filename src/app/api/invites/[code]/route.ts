import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("invite_links")
    .select("id, used_by, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ valid: false });
  }

  const expired = new Date(invite.expires_at) < new Date();
  const used = !!invite.used_by;

  return NextResponse.json({ valid: !expired && !used });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const body = await request.json().catch(() => ({}));
  const { user_id } = body as { user_id?: string };

  if (!user_id) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validate the invite is still usable
  const { data: invite } = await admin
    .from("invite_links")
    .select("id, used_by, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 400 });
  }

  if (invite.used_by) {
    return NextResponse.json({ error: "Invite already used" }, { status: 400 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }

  // Redeem the invite
  const { error } = await admin
    .from("invite_links")
    .update({ used_by: user_id, used_at: new Date().toISOString() })
    .eq("id", invite.id);

  if (error) {
    return NextResponse.json({ error: "Failed to redeem invite" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
