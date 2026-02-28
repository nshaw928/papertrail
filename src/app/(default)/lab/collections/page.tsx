"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, FolderOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLab } from "../lab-context";

interface LabCollection {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  work_count: number;
}

export default function LabCollectionsPage() {
  const { lab } = useLab();
  const router = useRouter();
  const [collections, setCollections] = useState<LabCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollections();
  }, [lab.id]);

  async function fetchCollections() {
    setLoading(true);
    try {
      const res = await fetch(`/api/labs/${lab.id}/collections`);
      if (res.ok) {
        setCollections(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/labs/${lab.id}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create collection");
        return;
      }
      const collection = await res.json();
      setDialogOpen(false);
      setName("");
      setDescription("");
      router.push(`/lab/collections/${collection.id}`);
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Lab Collections</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Collection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>New Lab Collection</DialogTitle>
                <DialogDescription>
                  Create a shared collection for your lab.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Input
                  placeholder="Collection name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={200}
                  autoFocus
                  disabled={creating}
                />
                <Textarea
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  disabled={creating}
                />
                {error && (
                  <p className="text-xs text-destructive">{error}</p>
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
                <Button type="submit" disabled={creating || !name.trim()}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {collections.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No lab collections yet.</p>
          <p className="text-sm mt-1">Create one to start organizing papers together.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => (
            <Link key={c.id} href={`/lab/collections/${c.id}`}>
              <Card className="hover:border-primary/50 transition-colors h-full">
                <CardHeader>
                  <CardTitle className="text-base">{c.name}</CardTitle>
                  {c.description && (
                    <CardDescription className="line-clamp-2">
                      {c.description}
                    </CardDescription>
                  )}
                  <div className="flex items-center gap-2 pt-1">
                    <Badge variant="secondary" className="text-xs">
                      {c.work_count} paper{c.work_count !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
