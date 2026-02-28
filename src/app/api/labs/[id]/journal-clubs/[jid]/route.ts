import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";

// GET: get a single journal club session with its files
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jid: string }> }
) {
  const { id: labId, jid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: jc, error } = await supabase
    .from("journal_clubs")
    .select("id, work_id, title, scheduled_at, presenter_id, notes, created_by, created_at, updated_at")
    .eq("id", jid)
    .eq("lab_id", labId)
    .single();

  if (error || !jc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Fetch files for this journal club
  const { data: files } = await supabase
    .from("journal_club_files")
    .select("id, file_name, file_size, mime_type, uploaded_by, uploaded_at")
    .eq("journal_club_id", jid)
    .order("uploaded_at", { ascending: false });

  return NextResponse.json({ ...jc, files: files ?? [] });
}

// PATCH: update a journal club session
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jid: string }> }
) {
  const { id: labId, jid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: jc } = await supabase
    .from("journal_clubs")
    .select("created_by")
    .eq("id", jid)
    .eq("lab_id", labId)
    .single();

  if (!jc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (jc.created_by !== user.id && role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  const { title, scheduled_at, presenter_id, notes } = body as {
    title?: string;
    scheduled_at?: string;
    presenter_id?: string | null;
    notes?: string | null;
  };

  if (title !== undefined) {
    if (title && title.length > 200) {
      return NextResponse.json({ error: "Title too long (max 200 chars)" }, { status: 400 });
    }
    updates.title = title?.trim() || null;
  }
  if (scheduled_at !== undefined) {
    if (isNaN(Date.parse(scheduled_at))) {
      return NextResponse.json({ error: "scheduled_at must be a valid date" }, { status: 400 });
    }
    updates.scheduled_at = scheduled_at;
  }
  if (presenter_id !== undefined) updates.presenter_id = presenter_id;
  if (notes !== undefined) {
    if (notes && notes.length > 5000) {
      return NextResponse.json({ error: "Notes too long (max 5000 chars)" }, { status: 400 });
    }
    updates.notes = notes?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("journal_clubs")
    .update(updates)
    .eq("id", jid)
    .eq("lab_id", labId)
    .select("id, work_id, title, scheduled_at, presenter_id, notes, created_by, created_at, updated_at")
    .single();

  if (error) {
    console.error("Failed to update journal club:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE: delete a journal club session
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jid: string }> }
) {
  const { id: labId, jid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // RLS handles creator or admin
  const { error } = await supabase
    .from("journal_clubs")
    .delete()
    .eq("id", jid)
    .eq("lab_id", labId);

  if (error) {
    console.error("Failed to delete journal club:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "deleted" });
}
