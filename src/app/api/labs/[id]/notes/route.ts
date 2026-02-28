import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { hasLabPermission } from "@/lib/supabase/lab-permissions";

// GET: list lab notes for a paper
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

  const workId = request.nextUrl.searchParams.get("work_id");
  if (!workId) {
    return NextResponse.json({ error: "work_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lab_paper_notes")
    .select("id, user_id, content, anchor_quote, created_at, updated_at")
    .eq("lab_id", labId)
    .eq("work_id", workId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST: create a lab note
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

  const canCreate = await hasLabPermission(supabase, labId, user.id, "create_lab_notes");
  if (!canCreate) {
    return NextResponse.json({ error: "You don't have permission to create notes" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { work_id, content, anchor_quote } = body as {
    work_id?: string;
    content?: string;
    anchor_quote?: string;
  };

  if (!work_id) {
    return NextResponse.json({ error: "work_id is required" }, { status: 400 });
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > 5000) {
    return NextResponse.json({ error: "Content too long (max 5000 chars)" }, { status: 400 });
  }
  if (anchor_quote && anchor_quote.length > 500) {
    return NextResponse.json({ error: "Quote too long (max 500 chars)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lab_paper_notes")
    .insert({
      lab_id: labId,
      work_id,
      user_id: user.id,
      content: content.trim(),
      anchor_quote: anchor_quote?.trim() || null,
    })
    .select("id, user_id, content, anchor_quote, created_at, updated_at")
    .single();

  if (error) {
    console.error("Failed to create lab note:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
