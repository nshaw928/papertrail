import { NextRequest, NextResponse } from "next/server";
import { createClient, requireApiUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type { Database } from "@/lib/types/database";

type FeatureStatus = Database["public"]["Enums"]["feature_status"];
const VALID_STATUSES: FeatureStatus[] = ["planned", "in_progress", "shipped", "considering"];

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: features, error } = await supabase
    .from("features")
    .select("*")
    .order("upvote_count", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load features" }, { status: 500 });
  }

  // If logged in, attach user's upvote status
  if (user) {
    const { data: upvotes } = await supabase
      .from("feature_upvotes")
      .select("feature_id")
      .eq("user_id", user.id);

    const upvotedSet = new Set(upvotes?.map((u) => u.feature_id) ?? []);

    return NextResponse.json(
      (features ?? []).map((f) => ({
        ...f,
        user_has_upvoted: upvotedSet.has(f.id),
      }))
    );
  }

  return NextResponse.json(
    (features ?? []).map((f) => ({ ...f, user_has_upvoted: false }))
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { title, description, status, priority } = body as {
    title?: string;
    description?: string;
    status?: string;
    priority?: number;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const featureStatus = (status || "planned") as FeatureStatus;
  if (!VALID_STATUSES.includes(featureStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("features")
    .insert({
      title: title.trim(),
      description: description?.trim() || null,
      status: featureStatus,
      priority: priority ?? 0,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to create feature" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
