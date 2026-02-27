import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/supabase/plans";

export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const workId = request.nextUrl.searchParams.get("work_id");

  const { data: collections, error } = await supabase
    .from("collections")
    .select("id, name, created_at")
    .eq("user_id", user.id)
    .order("name");

  if (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
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
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Check collection limit
  const limit = await checkLimit(supabase, user.id, "create_collection");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.reason, code: "LIMIT_REACHED" },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const name = (body as { name?: string }).name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: "Name too long (max 200 chars)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: user.id, name })
    .select("id, name, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
