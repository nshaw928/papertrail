import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import { getUserPlan } from "@/lib/supabase/plans";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const admin = createAdminClient();

  if (isAdmin(user.id)) {
    const { data, error } = await admin
      .from("invite_links")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  }

  const userPlan = await getUserPlan(supabase, user.id);
  if (userPlan.plan !== "alpha") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await admin
    .from("invite_links")
    .select("*")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load invites" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { user, supabase } = auth;

  const admin = createAdminClient();

  if (!isAdmin(user.id)) {
    const userPlan = await getUserPlan(supabase, user.id);
    if (userPlan.plan !== "alpha") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Alpha users: enforce 2-invite limit
    const { count } = await admin
      .from("invite_links")
      .select("*", { count: "exact", head: true })
      .eq("created_by", user.id);

    if ((count ?? 0) >= 2) {
      return NextResponse.json({ error: "Invite limit reached" }, { status: 403 });
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await admin
      .from("invite_links")
      .insert({
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

  // Admin: unlimited, custom expiry
  const body = await request.json().catch(() => ({}));
  const { email, expires_in_days } = body as {
    email?: string;
    expires_in_days?: number;
  };

  const days = expires_in_days ?? 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

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
