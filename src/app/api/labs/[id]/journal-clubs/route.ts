import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { hasLabPermission } from "@/lib/supabase/lab-permissions";

// GET: list journal club sessions
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: labId } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const tab = request.nextUrl.searchParams.get("tab") ?? "upcoming";
  const now = new Date().toISOString();

  let query = supabase
    .from("journal_clubs")
    .select("id, work_id, title, scheduled_at, presenter_id, notes, created_by, created_at, journal_club_files(count)")
    .eq("lab_id", labId);

  if (tab === "upcoming") {
    query = query.gte("scheduled_at", now).order("scheduled_at", { ascending: true });
  } else {
    query = query.lt("scheduled_at", now).order("scheduled_at", { ascending: false });
  }

  const { data, error } = await query.limit(50);

  if (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  const result = (data ?? []).map((jc) => ({
    id: jc.id,
    work_id: jc.work_id,
    title: jc.title,
    scheduled_at: jc.scheduled_at,
    presenter_id: jc.presenter_id,
    notes: jc.notes,
    created_by: jc.created_by,
    created_at: jc.created_at,
    file_count: (jc.journal_club_files as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  return NextResponse.json(result);
}

// POST: create a journal club session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: labId } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const canSchedule = await hasLabPermission(supabase, labId, user.id, "schedule_journal_club");
  if (!canSchedule) {
    return NextResponse.json({ error: "You don't have permission to schedule journal clubs" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { work_id, title, scheduled_at, presenter_id, notes } = body as {
    work_id?: string;
    title?: string;
    scheduled_at?: string;
    presenter_id?: string;
    notes?: string;
  };

  if (!work_id) {
    return NextResponse.json({ error: "work_id is required" }, { status: 400 });
  }
  if (!scheduled_at || isNaN(Date.parse(scheduled_at))) {
    return NextResponse.json({ error: "scheduled_at must be a valid date" }, { status: 400 });
  }
  if (title && title.length > 200) {
    return NextResponse.json({ error: "Title too long (max 200 chars)" }, { status: 400 });
  }
  if (notes && notes.length > 5000) {
    return NextResponse.json({ error: "Notes too long (max 5000 chars)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("journal_clubs")
    .insert({
      lab_id: labId,
      work_id,
      title: title?.trim() || null,
      scheduled_at,
      presenter_id: presenter_id || null,
      notes: notes?.trim() || null,
      created_by: user.id,
    })
    .select("id, work_id, title, scheduled_at, presenter_id, notes, created_by, created_at")
    .single();

  if (error) {
    console.error("Failed to create journal club:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
