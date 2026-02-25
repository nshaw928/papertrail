"use client";

import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NewCollectionButton() {
  const router = useRouter();

  async function handleCreate() {
    const name = prompt("Collection name:");
    if (!name?.trim()) return;
    const res = await fetch("/api/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    if (res.ok) {
      router.refresh();
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCreate}>
      <Plus className="mr-2 h-4 w-4" />
      New Collection
    </Button>
  );
}
