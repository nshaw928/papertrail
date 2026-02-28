import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { verifyCollectionOwnership } from "@/lib/supabase/collections";
import { untyped } from "@/lib/supabase/untyped";

const MAX_CONTRIBUTORS = 100;

// GET: list contributors for a lab collection
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const { id: labId, cid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Verify collection belongs to this lab
  const collection = await verifyCollectionOwnership(supabase, cid, labId);
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const { data, error } = await untyped(supabase)
    .from("lab_collection_contributors")
    .select("user_id")
    .eq("lab_collection_id", cid);

  if (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// PUT: replace the full contributors list
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  const { id: labId, cid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Verify collection belongs to this lab and check authorization
  const collection = await verifyCollectionOwnership(supabase, cid, labId);
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.created_by !== user.id && role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const userIds = (body as { user_ids?: string[] }).user_ids;
  if (!Array.isArray(userIds)) {
    return NextResponse.json({ error: "user_ids array is required" }, { status: 400 });
  }
  if (userIds.length > MAX_CONTRIBUTORS) {
    return NextResponse.json({ error: `Too many contributors (max ${MAX_CONTRIBUTORS})` }, { status: 400 });
  }

  // Delete existing and insert new in sequence
  // If insert fails, the old list is already gone — acceptable tradeoff
  // since the caller can retry with the correct list
  await untyped(supabase)
    .from("lab_collection_contributors")
    .delete()
    .eq("lab_collection_id", cid);

  if (userIds.length > 0) {
    const rows = userIds.map((uid) => ({
      lab_collection_id: cid,
      user_id: uid,
    }));

    const { error } = await untyped(supabase)
      .from("lab_collection_contributors")
      .insert(rows);

    if (error) {
      console.error("Failed to update contributors:", error.message);
      return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
    }
  }

  return NextResponse.json({ status: "updated" });
}
