"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Check, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface CollectionItem {
  id: string;
  name: string;
  is_member: boolean;
}

export default function AddToCollection({ workId }: { workId: string }) {
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New collection dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function fetchCollections() {
    setLoading(true);
    try {
      const res = await fetch(`/api/collections?work_id=${workId}`);
      if (res.ok) {
        setCollections(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function toggleMembership(collectionId: string, isMember: boolean) {
    setError(null);
    // Optimistic update
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, is_member: !c.is_member } : c
      )
    );

    const method = isMember ? "DELETE" : "POST";
    const res = await fetch(`/api/collections/${collectionId}/works`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_id: workId }),
    });

    if (!res.ok) {
      // Revert optimistic update
      setCollections((prev) =>
        prev.map((c) =>
          c.id === collectionId ? { ...c, is_member: isMember } : c
        )
      );
      setError("Failed to update collection");
    }
  }

  async function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setCreateError(data.error ?? "Failed to create collection");
        return;
      }
      const collection = await res.json();
      await fetch(`/api/collections/${collection.id}/works`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ work_id: workId }),
      });
      setCollections((prev) => [
        ...prev,
        { id: collection.id, name: collection.name, is_member: true },
      ]);
      setDialogOpen(false);
      setNewName("");
      router.refresh();
    } catch {
      setCreateError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <DropdownMenu onOpenChange={(open) => open && fetchCollections()}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Add to collection"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <FolderPlus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : collections.length === 0 ? (
            <div className="px-2 py-2 text-sm text-muted-foreground">
              No collections yet
            </div>
          ) : (
            collections.map((c) => (
              <DropdownMenuItem
                key={c.id}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleMembership(c.id, c.is_member);
                }}
              >
                <Check
                  className={`mr-2 h-4 w-4 ${c.is_member ? "opacity-100" : "opacity-0"}`}
                />
                {c.name}
              </DropdownMenuItem>
            ))
          )}
          {error && (
            <div className="px-2 py-1.5 text-xs text-destructive">{error}</div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Collection
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) {
            setNewName("");
            setCreateError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateAndAdd}>
            <DialogHeader>
              <DialogTitle>New Collection</DialogTitle>
              <DialogDescription>
                Give your collection a name to get started.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Collection name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={200}
                autoFocus
                disabled={creating}
              />
              {createError && (
                <p className="text-xs text-destructive mt-2">{createError}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newName.trim()}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
