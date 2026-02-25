import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const workId = (body as { work_id?: string }).work_id;
  if (!workId) {
    return NextResponse.json({ error: "work_id is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("collection_works")
    .upsert(
      { collection_id: id, work_id: workId },
      { onConflict: "collection_id,work_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ status: "added" });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const workId = (body as { work_id?: string }).work_id;
  if (!workId) {
    return NextResponse.json({ error: "work_id is required" }, { status: 400 });
  }

  await supabase
    .from("collection_works")
    .delete()
    .eq("collection_id", id)
    .eq("work_id", workId);

  return NextResponse.json({ status: "removed" });
}
