import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/supabase/plans";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Check saved papers limit
  const limit = await checkLimit(supabase, user.id, "save_paper");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.reason, code: "LIMIT_REACHED" },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const notes = (body as { notes?: string }).notes ?? null;

  const { error } = await supabase.from("saved_works").upsert(
    {
      user_id: user.id,
      work_id: id,
      notes,
    },
    { onConflict: "user_id,work_id" }
  );

  if (error) {
    console.error("Failed to save paper:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Fire-and-forget usage tracking
  supabase.rpc("increment_usage", { target_user_id: user.id, field: "papers_saved" })
    .then(({ error }) => { if (error) console.error("Usage tracking failed:", error.message); });

  return NextResponse.json({ status: "saved", work_id: id });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { error } = await supabase
    .from("saved_works")
    .delete()
    .eq("user_id", user.id)
    .eq("work_id", id);

  if (error) {
    console.error("Failed to unsave paper:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "removed", work_id: id });
}
