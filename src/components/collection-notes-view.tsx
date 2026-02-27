"use client";

import Link from "next/link";
import { StickyNote } from "lucide-react";
import type { PaperNote } from "@/lib/types/app";

interface NoteWithPaper extends PaperNote {
  paper_title: string;
}

interface CollectionNotesViewProps {
  notes: NoteWithPaper[];
}

export default function CollectionNotesView({ notes }: CollectionNotesViewProps) {
  if (notes.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <StickyNote className="mx-auto mb-2 size-8 opacity-30" />
        <p>No notes on papers in this collection yet.</p>
      </div>
    );
  }

  // Group notes by work_id
  const grouped = new Map<string, { title: string; notes: NoteWithPaper[] }>();
  for (const note of notes) {
    const existing = grouped.get(note.work_id);
    if (existing) {
      existing.notes.push(note);
    } else {
      grouped.set(note.work_id, { title: note.paper_title, notes: [note] });
    }
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([workId, { title, notes: paperNotes }]) => (
        <div key={workId} className="space-y-2">
          <Link
            href={`/paper/${workId}`}
            className="text-sm font-medium hover:underline"
          >
            {title}
          </Link>
          <div className="space-y-2 pl-3 border-l-2 border-muted">
            {paperNotes.map((note) => (
              <div key={note.id} className="space-y-1">
                {note.anchor_quote && (
                  <p className="text-xs text-muted-foreground italic line-clamp-2">
                    &ldquo;{note.anchor_quote}&rdquo;
                  </p>
                )}
                <p className="text-sm">{note.content}</p>
                <p className="text-xs text-muted-foreground">
                  {note.created_at && new Date(note.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
