"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareQuote, Plus, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PaperNote } from "@/lib/types/app";

interface PaperQuotesProps {
  workId: string;
}

export default function PaperQuotes({ workId }: PaperQuotesProps) {
  const [notes, setNotes] = useState<PaperNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quote, setQuote] = useState("");
  const [comment, setComment] = useState("");
  const [editComment, setEditComment] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchNotes = useCallback(async () => {
    const res = await fetch(`/api/papers/${workId}/notes`);
    if (res.ok) {
      setNotes(await res.json());
    }
    setLoading(false);
  }, [workId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleCreate() {
    if (!comment.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/papers/${workId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: comment.trim(),
        anchor_quote: quote.trim() || null,
      }),
    });
    if (res.ok) {
      setShowForm(false);
      setQuote("");
      setComment("");
      await fetchNotes();
    }
    setSaving(false);
  }

  async function handleUpdate(id: string) {
    if (!editComment.trim()) return;
    setSaving(true);
    const res = await fetch(`/api/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editComment.trim() }),
    });
    if (res.ok) {
      setEditingId(null);
      setEditComment("");
      await fetchNotes();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    action: () => void
  ) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      action();
    }
  }

  if (loading) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <MessageSquareQuote className="size-5" />
          Quotes & Notes
          {notes.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              ({notes.length})
            </span>
          )}
        </h2>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Plus className="size-4 mr-1" />
            Add
          </Button>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="space-y-2 rounded-md border p-3">
          <Textarea
            placeholder="Quote from paper (optional)"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleCreate)}
            className="text-sm italic"
            rows={2}
          />
          <Textarea
            placeholder="Your comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, handleCreate)}
            className="text-sm"
            rows={3}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleCreate} disabled={saving || !comment.trim()}>
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setQuote("");
                setComment("");
              }}
            >
              Cancel
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">
              {"\u2318"}+Enter to save
            </span>
          </div>
        </div>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">
          No quotes or notes yet.
        </p>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div key={note.id} className="group space-y-1 rounded-md border p-3">
            {note.anchor_quote && (
              <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground">
                {note.anchor_quote}
              </blockquote>
            )}

            {editingId === note.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editComment}
                  onChange={(e) => setEditComment(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, () => handleUpdate(note.id))}
                  className="text-sm"
                  rows={3}
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleUpdate(note.id)}
                    disabled={saving || !editComment.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingId(null);
                      setEditComment("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm">{note.content}</p>
            )}

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {note.created_at &&
                  new Date(note.created_at).toLocaleDateString()}
              </span>
              {editingId !== note.id && (
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => {
                      setEditingId(note.id);
                      setEditComment(note.content);
                    }}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
