import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { hasLabPermission } from "@/lib/supabase/lab-permissions";

// GET: list lab collections
// Supports ?work_id=XXX to include an `is_member` flag per collection
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

  const { data: collections, error } = await supabase
    .from("lab_collections")
    .select("id, name, description, created_by, created_at, lab_collection_works(count)")
    .eq("lab_id", labId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // If work_id is provided, check membership in one batch query
  let workMembership = new Set<string>();
  if (workId) {
    const collectionIds = (collections ?? []).map((c) => c.id);
    if (collectionIds.length > 0) {
      const { data: memberRows } = await supabase
        .from("lab_collection_works")
        .select("lab_collection_id")
        .eq("work_id", workId)
        .in("lab_collection_id", collectionIds);
      workMembership = new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (memberRows ?? []).map((r: any) => r.lab_collection_id as string)
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = (collections ?? []).map((c: any) => ({
    id: c.id as string,
    name: c.name as string,
    description: c.description as string | null,
    created_by: c.created_by as string,
    created_at: c.created_at as string,
    work_count: (c.lab_collection_works as { count: number }[])?.[0]?.count ?? 0,
    ...(workId ? { is_member: workMembership.has(c.id as string) } : {}),
  }));

  return NextResponse.json(result);
}

// POST: create a lab collection
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

  const canCreate = await hasLabPermission(supabase, labId, user.id, "create_collection");
  if (!canCreate) {
    return NextResponse.json({ error: "You don't have permission to create collections" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = (body as { name?: string }).name?.trim();
  const description = (body as { description?: string }).description?.trim() || null;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ error: "Name too long (max 200 chars)" }, { status: 400 });
  }
  if (description && description.length > 1000) {
    return NextResponse.json({ error: "Description too long (max 1000 chars)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lab_collections")
    .insert({ lab_id: labId, name, description, created_by: user.id })
    .select("id, name, description, created_by, created_at")
    .single();

  if (error) {
    console.error("Failed to create lab collection:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
