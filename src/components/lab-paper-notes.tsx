"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, Trash2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatRelativeDate } from "@/lib/format";

interface LabNote {
  id: string;
  user_id: string;
  content: string;
  anchor_quote: string | null;
  created_at: string;
  updated_at: string;
}

interface LabPaperNotesProps {
  workId: string;
  labId: string;
}

export default function LabPaperNotes({ workId, labId }: LabPaperNotesProps) {
  const [notes, setNotes] = useState<LabNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [content, setContent] = useState("");
  const [anchorQuote, setAnchorQuote] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    fetchNotes();
  }, [workId, labId]);

  async function fetchNotes() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/labs/${labId}/notes?work_id=${workId}`
      );
      if (res.ok) {
        setNotes(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/labs/${labId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_id: workId,
          content: content.trim(),
          anchor_quote: anchorQuote.trim() || undefined,
        }),
      });
      if (res.ok) {
        const note = await res.json();
        setNotes((prev) => [note, ...prev]);
        setContent("");
        setAnchorQuote("");
        setShowForm(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(noteId: string) {
    if (!editContent.trim()) return;

    const res = await fetch(`/api/labs/${labId}/notes/${noteId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? updated : n))
      );
      setEditingId(null);
    }
  }

  async function handleDelete(noteId: string) {
    const res = await fetch(`/api/labs/${labId}/notes/${noteId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading lab notes...
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FlaskConical className="h-4 w-4" />
          Lab Notes
        </h3>
        {!showForm && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            Add Lab Note
          </Button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="space-y-2 border rounded-lg p-3">
          <Textarea
            placeholder="Quote from the paper (optional)"
            value={anchorQuote}
            onChange={(e) => setAnchorQuote(e.target.value)}
            maxLength={500}
            rows={2}
            className="text-sm italic"
            disabled={saving}
          />
          <Textarea
            placeholder="Your note..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={5000}
            rows={3}
            disabled={saving}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handleCreate(e);
              }
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setContent("");
                setAnchorQuote("");
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={saving || !content.trim()}>
              {saving && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      )}

      {/* Notes list */}
      {notes.length === 0 && !showForm && (
        <p className="text-sm text-muted-foreground">
          No lab notes on this paper yet.
        </p>
      )}

      {notes.map((note) => (
        <div key={note.id} className="group border rounded-lg p-3 space-y-1">
          {note.anchor_quote && (
            <blockquote className="border-l-2 border-muted-foreground/30 pl-3 text-sm italic text-muted-foreground">
              {note.anchor_quote}
            </blockquote>
          )}

          {editingId === note.id ? (
            <div className="space-y-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                maxLength={5000}
                rows={3}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleUpdate(note.id)}
                  disabled={!editContent.trim()}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {formatRelativeDate(note.created_at)}
            </span>
            {editingId !== note.id && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    setEditingId(note.id);
                    setEditContent(note.content);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => handleDelete(note.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
