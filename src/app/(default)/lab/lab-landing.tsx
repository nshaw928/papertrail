"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FolderOpen,
  Megaphone,
  ShieldCheck,
  Sparkles,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface PendingInvitation {
  id: string;
  lab_id: string;
  lab_name: string;
  role: string;
}

interface LabLandingProps {
  invitations: PendingInvitation[];
  userEmail: string;
}

export default function LabLanding({ invitations, userEmail }: LabLandingProps) {
  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lab</h1>
        <p className="text-muted-foreground mt-1">
          A shared workspace for your research group — pool collections, share
          notes on papers, and stay in sync on what everyone is reading.
        </p>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && <InvitationCard invitations={invitations} />}

      {/* Value proposition */}
      <div className="space-y-5">
        <h2 className="text-lg font-semibold">What you get with a lab</h2>

        <div className="grid gap-4">
          <div className="flex gap-3">
            <FolderOpen className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Shared collections</p>
              <p className="text-sm text-muted-foreground">
                Pool reading lists across the group so everyone can browse, add
                to, and build on the same sets of papers.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <BookOpen className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Journal club</p>
              <p className="text-sm text-muted-foreground">
                Schedule and run paper discussions with file uploads for
                presenter slides and notes.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Megaphone className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Announcements feed</p>
              <p className="text-sm text-muted-foreground">
                Post updates to keep everyone in sync on what matters.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <StickyNote className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Lab notes on papers</p>
              <p className="text-sm text-muted-foreground">
                Leave notes that stay attached to the paper — shared context
                your whole lab can see and contribute to.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Member management &amp; roles</p>
              <p className="text-sm text-muted-foreground">
                Control access with owner, admin, and member roles.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium text-sm">Everything in Researcher included</p>
              <p className="text-sm text-muted-foreground">
                Every lab member gets full Researcher-tier features with their
                seat.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Coming soon */}
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We&apos;re putting the finishing touches on Labs. Stay tuned.
          </p>
        </CardContent>
      </Card>

      {/* Soft nudge */}
      <p className="text-sm text-muted-foreground">
        Already part of a research group? Ask your PI or lab admin to send an
        invitation to <span className="font-medium">{userEmail}</span>.
        You&apos;ll see it right here.
      </p>
    </div>
  );
}

function InvitationCard({ invitations }: { invitations: PendingInvitation[] }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept(invitationId: string) {
    setLoadingId(invitationId);
    setError(null);

    try {
      const res = await fetch("/api/labs/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to accept invitation");
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle>You&apos;ve been invited</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {invitations.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{inv.lab_name}</span>
              <Badge variant="secondary">{inv.role}</Badge>
            </div>
            <Button
              size="sm"
              disabled={loadingId !== null}
              onClick={() => handleAccept(inv.id)}
            >
              {loadingId === inv.id ? "Joining..." : "Accept & Join"}
            </Button>
          </div>
        ))}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
