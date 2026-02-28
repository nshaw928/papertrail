import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { requireLabRole } from "@/lib/supabase/labs";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLabPermission } from "@/lib/supabase/lab-permissions";
import { untyped } from "@/lib/supabase/untyped";
import { randomUUID } from "crypto";

const ALLOWED_EXTENSIONS = new Set([
  "pdf", "pptx", "ppt", "docx", "doc", "xlsx", "xls",
  "png", "jpg", "jpeg", "gif",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "image/png",
  "image/jpeg",
  "image/gif",
]);

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// POST: get a signed upload URL for a file
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; jid: string }> }
) {
  const { id: labId, jid } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const role = await requireLabRole(supabase, labId, user.id);
  if (!role) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const canUpload = await hasLabPermission(supabase, labId, user.id, "upload_files");
  if (!canUpload) {
    return NextResponse.json({ error: "You don't have permission to upload files" }, { status: 403 });
  }

  // Verify journal club exists and belongs to this lab
  const { data: jc } = await untyped(supabase)
    .from("journal_clubs")
    .select("id")
    .eq("id", jid)
    .eq("lab_id", labId)
    .single();

  if (!jc) {
    return NextResponse.json({ error: "Journal club not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const { file_name, file_size, mime_type } = body as {
    file_name?: string;
    file_size?: number;
    mime_type?: string;
  };

  if (!file_name || !mime_type) {
    return NextResponse.json({ error: "file_name and mime_type are required" }, { status: 400 });
  }

  // Validate extension
  const ext = file_name.split(".").pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json(
      { error: `File type .${ext} is not allowed. Allowed: ${[...ALLOWED_EXTENSIONS].join(", ")}` },
      { status: 400 }
    );
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.has(mime_type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
  }

  // Validate file size
  if (!file_size || typeof file_size !== "number" || file_size <= 0) {
    return NextResponse.json({ error: "file_size is required and must be positive" }, { status: 400 });
  }
  if (file_size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 50MB)" }, { status: 400 });
  }

  // Generate UUID-based storage path (NEVER user input in path)
  const fileUuid = randomUUID();
  const storagePath = `${labId}/${jid}/${fileUuid}.${ext}`;

  const admin = createAdminClient();

  // Create signed upload URL
  const { data: uploadData, error: uploadError } = await admin.storage
    .from("journal-club-files")
    .createSignedUploadUrl(storagePath);

  if (uploadError || !uploadData) {
    console.error("Failed to create signed upload URL:", uploadError?.message);
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  // Pre-create the file record so the client can confirm
  const { data: fileRecord, error: fileError } = await untyped(supabase)
    .from("journal_club_files")
    .insert({
      journal_club_id: jid,
      file_name: file_name.slice(0, 255),
      storage_path: storagePath,
      file_size: file_size || null,
      mime_type,
      uploaded_by: user.id,
    })
    .select("id, file_name, storage_path, file_size, mime_type, uploaded_at")
    .single();

  if (fileError) {
    console.error("Failed to create file record:", fileError.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({
    file: fileRecord,
    upload_url: uploadData.signedUrl,
    upload_token: uploadData.token,
    storage_path: storagePath,
  }, { status: 201 });
}
