"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus, Check, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CollectionItem {
  id: string;
  name: string;
  is_member: boolean;
}

export default function AddToCollection({ workId }: { workId: string }) {
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

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
    const method = isMember ? "DELETE" : "POST";
    await fetch(`/api/collections/${collectionId}/works`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ work_id: workId }),
    });
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, is_member: !c.is_member } : c
      )
    );
  }

  async function createAndAdd() {
    const name = prompt("Collection name:");
    if (!name?.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
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
        router.refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  return (
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
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            createAndAdd();
          }}
          disabled={creating}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Collection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
