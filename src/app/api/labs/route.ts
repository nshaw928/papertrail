import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserPlan } from "@/lib/supabase/plans";

// GET: list labs the user belongs to
export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Fetch memberships, then labs separately to avoid join cast
  const { data: memberships } = await supabase
    .from("lab_members")
    .select("lab_id, role")
    .eq("user_id", user.id);

  const labIds = (memberships ?? []).map((m) => m.lab_id);
  const { data: labs } = labIds.length > 0
    ? await supabase.from("labs").select("id, name, owner_id, created_at").in("id", labIds)
    : { data: [] as { id: string; name: string; owner_id: string; created_at: string }[] };

  const labMap = new Map((labs ?? []).map((l) => [l.id, l]));

  const result = (memberships ?? [])
    .map((m) => {
      const lab = labMap.get(m.lab_id);
      if (!lab) return null;
      return { ...lab, role: m.role };
    })
    .filter((l): l is NonNullable<typeof l> => l !== null);

  return NextResponse.json(result);
}

// POST: create a new lab
export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  const body = await request.json().catch(() => ({}));
  const name = (body as { name?: string }).name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Require an active Lab plan subscription
  const { plan } = await getUserPlan(admin, user.id);
  if (plan !== "lab") {
    return NextResponse.json(
      { error: "A Lab plan subscription is required" },
      { status: 403 }
    );
  }

  // One lab per user (one subscription = one lab)
  const { count: labCount } = await admin
    .from("labs")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if ((labCount ?? 0) > 0) {
    return NextResponse.json(
      { error: "You already own a lab" },
      { status: 409 }
    );
  }

  // Create lab
  const { data: lab, error: labError } = await admin
    .from("labs")
    .insert({ name, owner_id: user.id })
    .select("id, name, owner_id, created_at")
    .single();

  if (labError || !lab) {
    console.error("Failed to create lab:", labError?.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Add creator as owner member
  await admin.from("lab_members").insert({
    lab_id: lab.id,
    user_id: user.id,
    role: "owner",
    joined_at: new Date().toISOString(),
  });

  return NextResponse.json(lab, { status: 201 });
}
