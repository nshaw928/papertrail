import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { hasLabCollectionWriteAccess, verifyCollectionOwnership } from "@/lib/supabase/collections";
import { untyped } from "@/lib/supabase/untyped";

// GET: list papers in a lab collection
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
    .from("lab_collection_works")
    .select("work_id, added_by, added_at")
    .eq("lab_collection_id", cid)
    .order("added_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST: add a paper to a lab collection
export async function POST(
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

  // Check write access (also verifies collection belongs to this lab)
  const canWrite = await hasLabCollectionWriteAccess(supabase, cid, labId, user.id, role);
  if (!canWrite) {
    return NextResponse.json({ error: "You don't have permission to add papers to this collection" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const workId = (body as { work_id?: string }).work_id;
  if (!workId) {
    return NextResponse.json({ error: "work_id is required" }, { status: 400 });
  }

  const { error } = await untyped(supabase)
    .from("lab_collection_works")
    .upsert(
      { lab_collection_id: cid, work_id: workId, added_by: user.id },
      { onConflict: "lab_collection_id,work_id" }
    );

  if (error) {
    console.error("Failed to add work to lab collection:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "added" });
}

// DELETE: remove a paper from a lab collection
export async function DELETE(
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

  // Verify collection belongs to this lab
  const collection = await verifyCollectionOwnership(supabase, cid, labId);
  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const workId = (body as { work_id?: string }).work_id;
  if (!workId) {
    return NextResponse.json({ error: "work_id is required" }, { status: 400 });
  }

  // RLS handles who can delete (adder or admin)
  const { error } = await untyped(supabase)
    .from("lab_collection_works")
    .delete()
    .eq("lab_collection_id", cid)
    .eq("work_id", workId);

  if (error) {
    console.error("Failed to remove work from lab collection:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "removed" });
}
