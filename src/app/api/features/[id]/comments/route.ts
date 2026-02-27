import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { id: featureId } = await params;

  const { data: comments, error } = await supabase
    .from("feature_comments")
    .select("*")
    .eq("feature_id", featureId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to load comments" }, { status: 500 });
  }

  return NextResponse.json(comments ?? []);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: featureId } = await params;

  const body = await request.json().catch(() => ({}));
  const content = (body as { content?: string }).content?.trim();

  if (!content) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (content.length > 2000) {
    return NextResponse.json({ error: "Comment too long (max 2000 chars)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("feature_comments")
    .insert({
      feature_id: featureId,
      user_id: user.id,
      user_email: user.email!,
      content,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
