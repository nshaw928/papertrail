import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { hasLabPermission } from "@/lib/supabase/lab-permissions";
import { untyped } from "@/lib/supabase/untyped";

// GET: list lab announcements
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

  const limit = parseInt(request.nextUrl.searchParams.get("limit") ?? "20");
  const offset = parseInt(request.nextUrl.searchParams.get("offset") ?? "0");

  const { data, error } = await untyped(supabase)
    .from("lab_announcements")
    .select("id, user_id, work_id, content, created_at")
    .eq("lab_id", labId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST: create announcement
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

  const canPost = await hasLabPermission(supabase, labId, user.id, "post_announcement");
  if (!canPost) {
    return NextResponse.json({ error: "You don't have permission to post announcements" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const content = (body as { content?: string }).content?.trim();
  const workId = (body as { work_id?: string }).work_id || null;

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }
  if (content.length > 2000) {
    return NextResponse.json({ error: "Content too long (max 2000 chars)" }, { status: 400 });
  }

  const { data, error } = await untyped(supabase)
    .from("lab_announcements")
    .insert({
      lab_id: labId,
      user_id: user.id,
      work_id: workId,
      content,
    })
    .select("id, user_id, work_id, content, created_at")
    .single();

  if (error) {
    console.error("Failed to create announcement:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
