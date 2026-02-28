"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, UserPlus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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

interface LabDashboardProps {
  lab: { id: string; name: string; role: string };
  members: {
    user_id: string;
    role: string;
    email: string | null;
    display_name: string | null;
    joined_at: string | null;
  }[];
  invitations: {
    id: string;
    email: string;
    role: string;
    created_at: string | null;
    expires_at: string | null;
  }[];
  currentUserId: string;
}

export default function LabMembers({
  lab,
  members,
  invitations,
  currentUserId,
}: LabDashboardProps) {
  const router = useRouter();
  const isAdmin = lab.role === "owner" || lab.role === "admin";
  const isOwner = lab.role === "owner";
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  async function handleLeaveLab() {
    setLeaving(true);
    try {
      const res = await fetch(`/api/labs/${lab.id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (res.ok) {
        setLeaveOpen(false);
        router.refresh();
      }
    } finally {
      setLeaving(false);
    }
  }

  function displayMember(m: { email: string | null; display_name: string | null; user_id: string }) {
    if (m.display_name) return m.display_name;
    if (m.email) return m.email;
    return m.user_id.slice(0, 8) + "...";
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{lab.name}</h1>
          <p className="text-muted-foreground">
            {members.length} member{members.length !== 1 ? "s" : ""}
            {" \u00b7 "}
            <Badge variant="outline" className="ml-1">
              {lab.role}
            </Badge>
          </p>
        </div>
        {!isOwner && (
          <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-1" />
                Leave Lab
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Leave {lab.name}?</DialogTitle>
                <DialogDescription>
                  You will lose access to all lab collections, announcements, and
                  notes. You can be re-invited later.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setLeaveOpen(false)}
                  disabled={leaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLeaveLab}
                  disabled={leaving}
                >
                  {leaving ? "Leaving..." : "Leave Lab"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <CardDescription>
            People in your lab. {isAdmin ? "You can invite new members." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <span className="text-sm">
                    {displayMember(m)}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {m.role}
                  </Badge>
                </div>
                {isAdmin && m.role !== "owner" && m.user_id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={async () => {
                      try {
                        const res = await fetch(`/api/labs/${lab.id}/members`, {
                          method: "DELETE",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: m.user_id }),
                        });
                        if (!res.ok) console.error("Failed to remove member");
                      } catch {
                        console.error("Failed to remove member");
                      }
                      router.refresh();
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {invitations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Pending Invitations
              </p>
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm text-muted-foreground">
                    {inv.email}
                  </span>
                  <Badge variant="outline">pending</Badge>
                </div>
              ))}
            </div>
          )}

          {isAdmin && <InviteForm labId={lab.id} />}
        </CardContent>
      </Card>
    </div>
  );
}

function InviteForm({ labId }: { labId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(`/api/labs/${labId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to invite");
        return;
      }

      setMessage(
        data.status === "added"
          ? `${email} added to lab`
          : `Invitation sent to ${email}`
      );
      setEmail("");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleInvite} className="space-y-2 pt-2">
      <div className="flex items-center gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="colleague@university.edu"
          disabled={loading}
        />
        <Button type="submit" size="sm" disabled={loading || !email.trim()}>
          <UserPlus className="h-4 w-4 mr-1" />
          Invite
        </Button>
      </div>
      {message && (
        <p className="text-sm text-muted-foreground">{message}</p>
      )}
    </form>
  );
}
