"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Check, Plus, Loader2, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
  type: "personal" | "lab";
  lab_id?: string;
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
      // Fetch personal collections
      const personalRes = await fetch(`/api/collections?work_id=${workId}`);
      const personalData: { id: string; name: string; is_member: boolean }[] =
        personalRes.ok ? await personalRes.json() : [];

      const personal: CollectionItem[] = personalData.map((c) => ({
        ...c,
        type: "personal" as const,
      }));

      // Fetch lab collections (if user has a lab) — single query with is_member flag
      let labItems: CollectionItem[] = [];
      try {
        const labsRes = await fetch("/api/labs");
        if (labsRes.ok) {
          const labs = await labsRes.json();
          if (labs.length > 0) {
            const lab = labs[0];
            const labColRes = await fetch(
              `/api/labs/${lab.id}/collections?work_id=${workId}`
            );
            if (labColRes.ok) {
              const labCols: { id: string; name: string; is_member: boolean }[] =
                await labColRes.json();
              labItems = labCols.map((c) => ({
                id: c.id,
                name: c.name,
                is_member: c.is_member,
                type: "lab" as const,
                lab_id: lab.id,
              }));
            }
          }
        }
      } catch {
        // Lab fetch failed — just skip lab collections
      }

      setCollections([...personal, ...labItems]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleMembership(item: CollectionItem) {
    setError(null);
    // Optimistic update
    setCollections((prev) =>
      prev.map((c) =>
        c.id === item.id && c.type === item.type
          ? { ...c, is_member: !c.is_member }
          : c
      )
    );

    const method = item.is_member ? "DELETE" : "POST";
    const url =
      item.type === "lab"
        ? `/api/labs/${item.lab_id}/collections/${item.id}/works`
        : `/api/collections/${item.id}/works`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_id: workId }),
    });

    if (!res.ok) {
      // Revert optimistic update
      setCollections((prev) =>
        prev.map((c) =>
          c.id === item.id && c.type === item.type
            ? { ...c, is_member: item.is_member }
            : c
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
        {
          id: collection.id,
          name: collection.name,
          is_member: true,
          type: "personal",
        },
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

  const personalCollections = collections.filter((c) => c.type === "personal");
  const labCollections = collections.filter((c) => c.type === "lab");

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
          ) : (
            <>
              {/* Personal collections */}
              {personalCollections.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs">
                    My Collections
                  </DropdownMenuLabel>
                  {personalCollections.map((c) => (
                    <DropdownMenuItem
                      key={`personal-${c.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMembership(c);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${c.is_member ? "opacity-100" : "opacity-0"}`}
                      />
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {/* Lab collections */}
              {labCollections.length > 0 && (
                <>
                  {personalCollections.length > 0 && <DropdownMenuSeparator />}
                  <DropdownMenuLabel className="text-xs flex items-center gap-1">
                    <FlaskConical className="h-3 w-3" />
                    Lab Collections
                  </DropdownMenuLabel>
                  {labCollections.map((c) => (
                    <DropdownMenuItem
                      key={`lab-${c.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleMembership(c);
                      }}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${c.is_member ? "opacity-100" : "opacity-0"}`}
                      />
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </>
              )}

              {personalCollections.length === 0 &&
                labCollections.length === 0 && (
                  <div className="px-2 py-2 text-sm text-muted-foreground">
                    No collections yet
                  </div>
                )}
            </>
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
