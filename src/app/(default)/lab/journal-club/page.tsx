"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Calendar, Loader2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLab } from "../lab-context";

interface JournalClub {
  id: string;
  work_id: string;
  title: string | null;
  scheduled_at: string;
  presenter_id: string | null;
  notes: string | null;
  created_by: string;
  file_count: number;
}

export default function JournalClubPage() {
  const { lab } = useLab();
  const [upcoming, setUpcoming] = useState<JournalClub[]>([]);
  const [past, setPast] = useState<JournalClub[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [workId, setWorkId] = useState("");
  const [title, setTitle] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [lab.id]);

  async function fetchSessions() {
    setLoading(true);
    try {
      const [upRes, pastRes] = await Promise.all([
        fetch(`/api/labs/${lab.id}/journal-clubs?tab=upcoming`),
        fetch(`/api/labs/${lab.id}/journal-clubs?tab=past`),
      ]);
      if (upRes.ok) setUpcoming(await upRes.json());
      if (pastRes.ok) setPast(await pastRes.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!workId.trim() || !scheduledAt) return;

    setCreating(true);
    setError(null);
    try {
      const res = await fetch(`/api/labs/${lab.id}/journal-clubs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          work_id: workId.trim(),
          title: title.trim() || undefined,
          scheduled_at: new Date(scheduledAt).toISOString(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create session");
        return;
      }
      setDialogOpen(false);
      setWorkId("");
      setTitle("");
      setScheduledAt("");
      fetchSessions();
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function SessionCard({ session }: { session: JournalClub }) {
    return (
      <Link href={`/lab/journal-club/${session.id}`}>
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {session.title || session.work_id}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(session.scheduled_at)}
              </span>
              {session.file_count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {session.file_count} file{session.file_count !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    );
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
        <h2 className="text-2xl font-bold tracking-tight">Journal Club</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Schedule Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Schedule Journal Club</DialogTitle>
                <DialogDescription>
                  Pick a paper and date for your next discussion.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium">Paper ID</label>
                  <Input
                    placeholder="e.g. W2741809807"
                    value={workId}
                    onChange={(e) => setWorkId(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Title (optional)</label>
                  <Input
                    placeholder="Session title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={200}
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    disabled={creating}
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
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
                <Button type="submit" disabled={creating || !workId.trim() || !scheduledAt}>
                  {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Schedule
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="space-y-4 mt-4">
          {upcoming.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No upcoming sessions.</p>
              <p className="text-sm mt-1">Schedule one to get started.</p>
            </div>
          ) : (
            upcoming.map((s) => <SessionCard key={s.id} session={s} />)
          )}
        </TabsContent>
        <TabsContent value="past" className="space-y-4 mt-4">
          {past.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No past sessions yet.
            </p>
          ) : (
            past.map((s) => <SessionCard key={s.id} session={s} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
