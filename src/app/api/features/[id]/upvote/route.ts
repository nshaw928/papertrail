import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;
  const { id: featureId } = await params;

  // Check if already upvoted
  const { data: existing } = await supabase
    .from("feature_upvotes")
    .select("feature_id")
    .eq("feature_id", featureId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Remove upvote
    const { error } = await supabase
      .from("feature_upvotes")
      .delete()
      .eq("feature_id", featureId)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to remove vote" }, { status: 500 });
    }
    return NextResponse.json({ upvoted: false });
  }

  // Add upvote — RLS enforces paid-only
  const { error } = await supabase
    .from("feature_upvotes")
    .insert({ feature_id: featureId, user_id: user.id });

  if (error) {
    if (error.code === "42501") {
      return NextResponse.json(
        { error: "Upgrade to a paid plan to vote", code: "UPGRADE_REQUIRED" },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Failed to vote" }, { status: 500 });
  }

  return NextResponse.json({ upvoted: true });
}
