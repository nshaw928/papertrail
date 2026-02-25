"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CollectionHeaderProps {
  id: string;
  name: string;
  count: number;
}

export default function CollectionHeader({
  id,
  name,
  count,
}: CollectionHeaderProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name);
  const [loading, setLoading] = useState(false);

  async function handleRename() {
    if (!editName.trim() || editName.trim() === name) {
      setEditing(false);
      setEditName(name);
      return;
    }
    setLoading(true);
    try {
      await fetch(`/api/collections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this collection? Papers will not be removed from your library.")) return;
    await fetch(`/api/collections/${id}`, { method: "DELETE" });
    router.push("/library");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") {
                setEditing(false);
                setEditName(name);
              }
            }}
            className="text-2xl font-bold h-auto py-1"
            autoFocus
            disabled={loading}
          />
          <Button variant="ghost" size="sm" onClick={handleRename} disabled={loading}>
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(false);
              setEditName(name);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold tracking-tight">{name}</h1>
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      <p className="text-muted-foreground">
        {count} paper{count !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
