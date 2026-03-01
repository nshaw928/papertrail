import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
  // Resolve user from session or from body (signup may not have full session yet)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const body = await request.json().catch(() => ({}));
  const bodyUserId = (body as { user_id?: string }).user_id;
  const userId = user?.id ?? bodyUserId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // If both exist, they must match (prevent spoofing)
  if (user && bodyUserId && user.id !== bodyUserId) {
    return NextResponse.json({ error: "User mismatch" }, { status: 403 });
  }

  const { code } = await params;
  const admin = createAdminClient();

  // Atomic redeem: only update if used_by is still null (prevents race condition)
  const { data: redeemed, error } = await admin
    .from("invite_links")
    .update({ used_by: userId, used_at: new Date().toISOString() })
    .eq("code", code)
    .is("used_by", null)
    .gt("expires_at", new Date().toISOString())
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to redeem invite" }, { status: 500 });
  }

  if (!redeemed) {
    return NextResponse.json({ error: "Invalid, expired, or already used invite code" }, { status: 400 });
  }

  // Auto-assign alpha plan to invited users
  await admin
    .from("subscriptions")
    .upsert(
      { user_id: userId, plan: "alpha", status: "active" },
      { onConflict: "user_id" }
    );

  return NextResponse.json({ success: true });
}
