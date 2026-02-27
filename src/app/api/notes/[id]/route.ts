import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, anchor_page } = body as Record<string, unknown>;

  // Build update payload — at least one field must be present
  const updates: Record<string, unknown> = {};

  if (content !== undefined) {
    if (typeof content !== "string" || content.trim().length === 0) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }
    if (content.length > 10_000) {
      return NextResponse.json({ error: "Content too long (max 10,000 chars)" }, { status: 400 });
    }
    updates.content = content.trim();
  }

  if (anchor_page !== undefined) {
    if (anchor_page !== null) {
      if (!Number.isInteger(anchor_page) || (anchor_page as number) < 1) {
        return NextResponse.json({ error: "anchor_page must be a positive integer or null" }, { status: 400 });
      }
    }
    updates.anchor_page = anchor_page;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: note, error } = await supabase
    .from("paper_notes")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, work_id, content, anchor_page, anchor_y, anchor_quote, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    console.error("Failed to update note:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(note);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid note ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("paper_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Failed to delete note:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
