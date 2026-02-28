import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verify the journal club belongs to the lab. Returns true if valid.
 */
async function verifyJournalClubOwnership(
  supabase: SupabaseClient,
  jid: string,
  labId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("journal_clubs")
    .select("id")
    .eq("id", jid)
    .eq("lab_id", labId)
    .single();
  return !!data;
}

// GET: get a signed download URL for a file
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jid: string; fid: string }> }
) {
  const { id: labId, jid, fid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Verify journal club belongs to this lab
  if (!(await verifyJournalClubOwnership(supabase, jid, labId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: file } = await supabase
    .from("journal_club_files")
    .select("storage_path, file_name")
    .eq("id", fid)
    .eq("journal_club_id", jid)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: downloadData, error: downloadError } = await admin.storage
    .from("journal-club-files")
    .createSignedUrl(file.storage_path, 900, {
      download: file.file_name, // Sets Content-Disposition: attachment
    });

  if (downloadError || !downloadData) {
    console.error("Failed to create signed download URL:", downloadError?.message);
    return NextResponse.json({ error: "Failed to create download URL" }, { status: 500 });
  }

  return NextResponse.json({ url: downloadData.signedUrl });
}

// DELETE: delete a file
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; jid: string; fid: string }> }
) {
  const { id: labId, jid, fid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  // Verify journal club belongs to this lab
  if (!(await verifyJournalClubOwnership(supabase, jid, labId))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Get file record — verify ownership for non-admins
  const { data: file } = await supabase
    .from("journal_club_files")
    .select("storage_path, uploaded_by")
    .eq("id", fid)
    .eq("journal_club_id", jid)
    .single();

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.uploaded_by !== user.id && role !== "owner" && role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Delete DB record first (safer: orphaned storage > broken DB reference)
  const { error } = await supabase
    .from("journal_club_files")
    .delete()
    .eq("id", fid)
    .eq("journal_club_id", jid);

  if (error) {
    console.error("Failed to delete file record:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Then delete from storage
  const admin = createAdminClient();
  await admin.storage
    .from("journal-club-files")
    .remove([file.storage_path]);

  return NextResponse.json({ status: "deleted" });
}
