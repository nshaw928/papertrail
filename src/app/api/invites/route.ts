import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invite_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { email, expires_in_days } = body as {
    email?: string;
    expires_in_days?: number;
  };

  const days = expires_in_days ?? 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("invite_links")
    .insert({
      email: email?.trim() || null,
      created_by: user.id,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
