"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PaperCard from "@/components/paper-card";
import type { WorkWithRelations } from "@/lib/types/app";

interface LabCollectionDetailProps {
  collection: {
    id: string;
    name: string;
    description: string | null;
    created_by: string;
  };
  papers: WorkWithRelations[];
  contributors: string[];
  labId: string;
  userRole: string;
  userId: string;
}

export default function LabCollectionDetail({
  collection,
  papers,
  labId,
  userRole,
  userId,
}: LabCollectionDetailProps) {
  const router = useRouter();
  const canEdit =
    collection.created_by === userId ||
    userRole === "owner" ||
    userRole === "admin";

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(collection.name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleRename() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === collection.name) {
      setEditing(false);
      setEditName(collection.name);
      return;
    }

    const res = await fetch(
      `/api/labs/${labId}/collections/${collection.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      }
    );

    if (res.ok) {
      router.refresh();
    }
    setEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(
      `/api/labs/${labId}/collections/${collection.id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      router.push("/lab/collections");
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={200}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename();
                  if (e.key === "Escape") {
                    setEditing(false);
                    setEditName(collection.name);
                  }
                }}
                className="text-xl font-bold h-auto py-1"
              />
              <Button variant="ghost" size="icon-xs" onClick={handleRename}>
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => {
                  setEditing(false);
                  setEditName(collection.name);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight">
                {collection.name}
              </h2>
              <Badge variant="outline" className="text-xs">Lab</Badge>
            </div>
          )}
          {collection.description && (
            <p className="text-sm text-muted-foreground">
              {collection.description}
            </p>
          )}
          <p className="text-sm text-muted-foreground">
            {papers.length} paper{papers.length !== 1 ? "s" : ""}
          </p>
        </div>

        {canEdit && !editing && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setEditing(true)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Papers */}
      {papers.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No papers in this collection yet. Use the collection picker on any
          paper to add it.
        </p>
      ) : (
        <div className="space-y-4">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </div>
      )}

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete collection?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{collection.name}&quot; and
              remove all papers from it. The papers themselves are not deleted.
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
