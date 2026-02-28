import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";

// PATCH: update collection name/description
export async function PATCH(
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

  // Only creator or admin/owner can update
  const { data: collection } = await supabase
    .from("lab_collections")
    .select("created_by")
    .eq("id", cid)
    .eq("lab_id", labId)
    .single();

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.created_by !== user.id && role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  const name = (body as { name?: string }).name?.trim();
  if (name !== undefined) {
    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (name.length > 200) {
      return NextResponse.json({ error: "Name too long (max 200 chars)" }, { status: 400 });
    }
    updates.name = name;
  }

  const description = (body as { description?: string }).description;
  if (description !== undefined) {
    const desc = description?.trim() || null;
    if (desc && desc.length > 1000) {
      return NextResponse.json({ error: "Description too long (max 1000 chars)" }, { status: 400 });
    }
    updates.description = desc;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("lab_collections")
    .update(updates)
    .eq("id", cid)
    .eq("lab_id", labId)
    .select("id, name, description, created_by, created_at, updated_at")
    .single();

  if (error) {
    console.error("Failed to update lab collection:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE: delete a lab collection
export async function DELETE(
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

  // Only creator or admin/owner can delete
  const { data: collection } = await supabase
    .from("lab_collections")
    .select("created_by")
    .eq("id", cid)
    .eq("lab_id", labId)
    .single();

  if (!collection) {
    return NextResponse.json({ error: "Collection not found" }, { status: 404 });
  }

  if (collection.created_by !== user.id && role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const { error } = await supabase
    .from("lab_collections")
    .delete()
    .eq("id", cid)
    .eq("lab_id", labId);

  if (error) {
    console.error("Failed to delete lab collection:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "deleted" });
}
