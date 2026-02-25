import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole, loadLabCollections } from "@/lib/supabase/labs";

// GET: list shared collections for a lab
export async function GET(
  _request: NextRequest,
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

  const collections = await loadLabCollections(supabase, labId);
  return NextResponse.json(collections);
}

// POST: share a collection with the lab
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

  const body = await request.json().catch(() => ({}));
  const { collectionId } = body as { collectionId?: string };
  if (!collectionId) {
    return NextResponse.json({ error: "collectionId required" }, { status: 400 });
  }

  // Verify ownership of the collection
  const { data: collection } = await supabase
    .from("collections")
    .select("id")
    .eq("id", collectionId)
    .eq("user_id", user.id)
    .single();

  if (!collection) {
    return NextResponse.json({ error: "Collection not found or not owned" }, { status: 404 });
  }

  // Update collection visibility
  await supabase
    .from("collections")
    .update({ visibility: "lab" })
    .eq("id", collectionId);

  // Add to lab_collections
  const { error } = await supabase.from("lab_collections").upsert(
    { lab_id: labId, collection_id: collectionId },
    { onConflict: "lab_id,collection_id" }
  );

  if (error) {
    console.error("Failed to share collection:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "shared" }, { status: 201 });
}

// PATCH: pin/unpin a collection (owner/admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: labId } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id, ["owner", "admin"]);
  if (!role) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const { collectionId, pinned } = body as {
    collectionId?: string;
    pinned?: boolean;
  };
  if (!collectionId || pinned === undefined) {
    return NextResponse.json(
      { error: "collectionId and pinned required" },
      { status: 400 }
    );
  }

  await supabase
    .from("lab_collections")
    .update({
      pinned,
      pinned_by: pinned ? user.id : null,
      pinned_at: pinned ? new Date().toISOString() : null,
    })
    .eq("lab_id", labId)
    .eq("collection_id", collectionId);

  return NextResponse.json({ status: "updated" });
}
