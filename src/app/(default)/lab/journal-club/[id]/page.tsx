"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Download,
  FileText,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLab } from "../../lab-context";

interface JournalClubDetail {
  id: string;
  work_id: string;
  title: string | null;
  scheduled_at: string;
  presenter_id: string | null;
  notes: string | null;
  created_by: string;
  files: JCFile[];
}

interface JCFile {
  id: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_at: string;
}

export default function JournalClubDetailPage() {
  const { lab } = useLab();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<JournalClubDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isAdmin = lab.role === "owner" || lab.role === "admin";

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/labs/${lab.id}/journal-clubs/${params.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setSession(data);
        setNotes(data.notes ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, [lab.id, params.id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  async function handleSaveNotes() {
    if (!session) return;
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/labs/${lab.id}/journal-clubs/${session.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() }),
      });
      if (!res.ok) {
        console.error("Failed to save notes");
      }
    } finally {
      setSavingNotes(false);
    }
  }

  async function handleDelete() {
    if (!session) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/labs/${lab.id}/journal-clubs/${session.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/lab/journal-club");
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !session) return;

    setUploading(true);
    setUploadError(null);
    try {
      const signRes = await fetch(
        `/api/labs/${lab.id}/journal-clubs/${session.id}/files`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file_name: file.name,
            file_size: file.size,
            mime_type: file.type,
          }),
        }
      );

      if (!signRes.ok) {
        const data = await signRes.json().catch(() => ({}));
        setUploadError(data.error ?? "Failed to start upload");
        return;
      }

      const { upload_url, file: fileRecord } = await signRes.json();

      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "x-upsert": "true",
        },
        body: file,
      });

      if (uploadRes.ok) {
        setSession((prev) =>
          prev ? { ...prev, files: [...prev.files, fileRecord] } : prev
        );
      } else {
        setUploadError("Upload failed");
      }
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleDownload(fileId: string) {
    if (!session) return;
    const res = await fetch(
      `/api/labs/${lab.id}/journal-clubs/${session.id}/files/${fileId}`
    );
    if (res.ok) {
      const { url } = await res.json();
      window.open(url, "_blank");
    }
  }

  async function handleDeleteFile(fileId: string) {
    if (!session) return;
    const res = await fetch(
      `/api/labs/${lab.id}/journal-clubs/${session.id}/files/${fileId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setSession((prev) =>
        prev ? { ...prev, files: prev.files.filter((f) => f.id !== fileId) } : prev
      );
    }
  }

  if (loading || !session) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const scheduledDate = new Date(session.scheduled_at);
  const isPast = scheduledDate < new Date();

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {session.title || "Journal Club Session"}
          </h2>
          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {scheduledDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            {isPast && <Badge variant="secondary">Past</Badge>}
          </div>
        </div>
        {isAdmin && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete session"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Paper link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paper</CardTitle>
        </CardHeader>
        <CardContent>
          <Link
            href={`/paper/${session.work_id}`}
            className="text-primary hover:underline text-sm"
          >
            {session.work_id}
          </Link>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            placeholder="Session notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={5000}
            rows={6}
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSaveNotes}
              disabled={savingNotes}
            >
              {savingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Files */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Files</CardTitle>
          <div>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
              accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.gif"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => document.getElementById("file-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              Upload
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {uploadError && (
            <p className="text-xs text-destructive mb-2">{uploadError}</p>
          )}
          {session.files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No files uploaded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {session.files.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{f.file_name}</span>
                    {f.file_size && (
                      <span className="text-xs text-muted-foreground">
                        ({(f.file_size / 1024 / 1024).toFixed(1)} MB)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDownload(f.id)}
                      aria-label="Download file"
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleDeleteFile(f.id)}
                      aria-label="Delete file"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this session?</DialogTitle>
            <DialogDescription>
              This will permanently delete the journal club session and all uploaded files.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
