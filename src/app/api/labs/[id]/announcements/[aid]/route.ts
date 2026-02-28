import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { untyped } from "@/lib/supabase/untyped";

// DELETE: delete an announcement
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; aid: string }> }
) {
  const { id: labId, aid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // RLS handles: author or admin can delete
  const { error } = await untyped(supabase)
    .from("lab_announcements")
    .delete()
    .eq("id", aid)
    .eq("lab_id", labId);

  if (error) {
    console.error("Failed to delete announcement:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "deleted" });
}
