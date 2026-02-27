import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!/^W\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid paper ID" }, { status: 400 });
  }

  const { data: notes, error } = await supabase
    .from("paper_notes")
    .select("id, work_id, content, anchor_page, anchor_y, anchor_quote, created_at, updated_at")
    .eq("user_id", user.id)
    .eq("work_id", id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load notes:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(notes);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!/^W\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid paper ID" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content, anchor_page, anchor_y, anchor_quote } = body as Record<string, unknown>;

  // Validate content
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > 10_000) {
    return NextResponse.json({ error: "Content too long (max 10,000 chars)" }, { status: 400 });
  }

  // Validate anchor_page
  if (anchor_page !== undefined && anchor_page !== null) {
    if (!Number.isInteger(anchor_page) || (anchor_page as number) < 1) {
      return NextResponse.json({ error: "anchor_page must be a positive integer" }, { status: 400 });
    }
  }

  // Validate anchor_y
  if (anchor_y !== undefined && anchor_y !== null) {
    if (typeof anchor_y !== "number" || anchor_y < 0 || anchor_y > 1) {
      return NextResponse.json({ error: "anchor_y must be a float between 0 and 1" }, { status: 400 });
    }
  }

  // Validate anchor_quote
  if (anchor_quote !== undefined && anchor_quote !== null) {
    if (typeof anchor_quote !== "string" || anchor_quote.length > 1_000) {
      return NextResponse.json({ error: "anchor_quote too long (max 1,000 chars)" }, { status: 400 });
    }
  }

  const { data: note, error } = await supabase
    .from("paper_notes")
    .insert({
      user_id: user.id,
      work_id: id,
      content: (content as string).trim(),
      anchor_page: (anchor_page as number | null) ?? null,
      anchor_y: (anchor_y as number | null) ?? null,
      anchor_quote: (anchor_quote as string | null)?.trim() || null,
    })
    .select("id, work_id, content, anchor_page, anchor_y, anchor_quote, created_at, updated_at")
    .single();

  if (error) {
    console.error("Failed to create note:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(note, { status: 201 });
}
