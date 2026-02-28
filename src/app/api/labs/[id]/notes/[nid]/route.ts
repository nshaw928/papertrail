import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { untyped } from "@/lib/supabase/untyped";

// PATCH: update a lab note (author only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nid: string }> }
) {
  const { id: labId, nid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const content = (body as { content?: string }).content?.trim();

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "Content too long (max 5000 chars)" }, { status: 400 });
  }

  const { data, error } = await untyped(supabase)
    .from("lab_paper_notes")
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", nid)
    .eq("lab_id", labId)
    .eq("user_id", user.id)
    .select("id, user_id, content, anchor_quote, created_at, updated_at")
    .single();

  if (error) {
    console.error("Failed to update lab note:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE: delete a lab note (author only)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; nid: string }> }
) {
  const { id: labId, nid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { error } = await untyped(supabase)
    .from("lab_paper_notes")
    .delete()
    .eq("id", nid)
    .eq("lab_id", labId)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete lab note:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
