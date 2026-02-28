"use client";

import { useState, useEffect } from "react";
import { FlaskConical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShareToLabProps {
  workId: string;
  paperTitle: string;
}

export default function ShareToLab({ workId, paperTitle }: ShareToLabProps) {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [labId, setLabId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if user has a lab
    fetch("/api/labs")
      .then((res) => (res.ok ? res.json() : []))
      .then((labs) => {
        if (labs.length > 0) setLabId(labs[0].id);
      })
      .catch(() => {});
  }, []);

  if (!labId) return null;

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`/api/labs/${labId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), work_id: workId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to share");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setContent("");
        setSuccess(false);
      }, 1500);
    } catch {
      setError("Something went wrong");
    } finally {
      setPosting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (!v) {
        setContent("");
        setError(null);
        setSuccess(false);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FlaskConical className="h-4 w-4 mr-1" />
          Share to Lab
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleShare}>
          <DialogHeader>
            <DialogTitle>Share to Lab</DialogTitle>
            <DialogDescription>
              Post this paper to your lab&apos;s announcements feed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="text-sm font-medium line-clamp-2">{paperTitle}</div>
            <Textarea
              placeholder="Add a comment about this paper..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              rows={3}
              disabled={posting || success}
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            {success && (
              <p className="text-xs text-green-500">Shared to lab!</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={posting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={posting || !content.trim() || success}
            >
              {posting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Share
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
