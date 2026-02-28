"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, FolderOpen, Megaphone, Users, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/format";

interface DashboardProps {
  lab: { id: string; name: string; role: string };
  memberCount: number;
  recentAnnouncements: {
    id: string;
    user_id: string;
    work_id: string | null;
    content: string;
    created_at: string;
  }[];
  nextJournalClub: {
    id: string;
    work_id: string;
    title: string | null;
    scheduled_at: string;
    presenter_id: string | null;
  } | null;
  collections: {
    id: string;
    name: string;
    work_count: number;
  }[];
}

export default function LabDashboardOverview({
  lab,
  memberCount,
  recentAnnouncements,
  nextJournalClub,
  collections,
}: DashboardProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{lab.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </span>
          <Badge variant="outline">{lab.role}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Next Journal Club */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Upcoming Journal Club
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/lab/journal-club">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {nextJournalClub ? (
              <Link
                href={`/lab/journal-club/${nextJournalClub.id}`}
                className="block hover:underline"
              >
                <p className="text-sm font-medium">
                  {nextJournalClub.title || nextJournalClub.work_id}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(nextJournalClub.scheduled_at).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }
                  )}
                </p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">
                No upcoming sessions
              </p>
            )}
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Members
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/lab/members">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{memberCount}</p>
            <p className="text-xs text-muted-foreground">active members</p>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Megaphone className="h-4 w-4" />
              Recent Announcements
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/lab/announcements">
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet</p>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="flex items-start justify-between gap-4">
                    <p className="text-sm line-clamp-2">{a.content}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeDate(a.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Collections */}
        {collections.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-1.5">
                <FolderOpen className="h-4 w-4" />
                Collections
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/lab/collections">
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {collections.map((c) => (
                  <Link
                    key={c.id}
                    href={`/lab/collections/${c.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:border-primary/50 transition-colors"
                  >
                    <span className="text-sm font-medium">{c.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {c.work_count} paper{c.work_count !== 1 ? "s" : ""}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
