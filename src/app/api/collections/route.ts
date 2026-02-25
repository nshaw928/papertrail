import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workId = request.nextUrl.searchParams.get("work_id");

  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (workId) {
    const { data: memberships } = await supabase
      .from("collection_works")
      .select("collection_id")
      .eq("work_id", workId);

    const memberSet = new Set(memberships?.map((m) => m.collection_id) ?? []);

    return NextResponse.json(
      (collections ?? []).map((c) => ({
        ...c,
        is_member: memberSet.has(c.id),
      }))
    );
  }

  return NextResponse.json(collections ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const name = (body as { name?: string }).name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: user.id, name })
    .select("id, name, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
