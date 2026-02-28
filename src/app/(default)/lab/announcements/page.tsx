"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Trash2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatRelativeDate } from "@/lib/format";
import { useLab } from "../lab-context";

interface Announcement {
  id: string;
  user_id: string;
  work_id: string | null;
  content: string;
  created_at: string;
}

export default function AnnouncementsPage() {
  const { lab } = useLab();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);

  const isAdmin = lab.role === "owner" || lab.role === "admin";

  useEffect(() => {
    fetchAnnouncements();
  }, [lab.id]);

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const res = await fetch(`/api/labs/${lab.id}/announcements?limit=50`);
      if (res.ok) {
        setAnnouncements(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    try {
      const res = await fetch(`/api/labs/${lab.id}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const newAnnouncement = await res.json();
        setAnnouncements((prev) => [newAnnouncement, ...prev]);
        setContent("");
      }
    } finally {
      setPosting(false);
    }
  }

  async function handleDelete(announcementId: string) {
    const res = await fetch(
      `/api/labs/${lab.id}/announcements/${announcementId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcementId));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Announcements</h2>

      {/* Post form */}
      <form onSubmit={handlePost} className="space-y-2">
        <Textarea
          placeholder="Share something with your lab..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          rows={3}
          disabled={posting}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={posting || !content.trim()}>
            {posting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Post
          </Button>
        </div>
      </form>

      {/* Announcements list */}
      {announcements.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No announcements yet.</p>
          <p className="text-sm mt-1">Be the first to share something with your lab.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="border rounded-lg p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {formatRelativeDate(a.created_at)}
                </span>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handleDelete(a.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{a.content}</p>
              {a.work_id && (
                <Link
                  href={`/paper/${a.work_id}`}
                  className="text-xs text-primary hover:underline"
                >
                  <Badge variant="outline" className="text-xs">
                    View Paper
                  </Badge>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
