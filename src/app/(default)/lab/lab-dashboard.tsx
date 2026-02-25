"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pin, Trash2, UserPlus } from "lucide-react";
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

interface LabDashboardProps {
  lab: { id: string; name: string; role: string };
  members: {
    user_id: string;
    role: string;
    invited_email: string | null;
    joined_at: string | null;
  }[];
  invitations: {
    id: string;
    email: string;
    role: string;
    created_at: string | null;
    expires_at: string | null;
  }[];
  sharedCollections: {
    id: string;
    name: string;
    user_id: string;
    pinned: boolean;
  }[];
}

export default function LabDashboard({
  lab,
  members,
  invitations,
  sharedCollections,
}: LabDashboardProps) {
  const router = useRouter();
  const isAdmin = lab.role === "owner" || lab.role === "admin";

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
                    {m.invited_email ?? m.user_id}
                  </span>
                  <Badge variant="secondary" className="ml-2">
                    {m.role}
                  </Badge>
                </div>
                {isAdmin && m.role !== "owner" && (
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

      {/* Shared Collections */}
      <Card>
        <CardHeader>
          <CardTitle>Shared Collections</CardTitle>
          <CardDescription>
            Collections shared with the lab.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sharedCollections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No collections shared yet. Share a collection from your library.
            </p>
          ) : (
            <div className="space-y-2">
              {sharedCollections.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-sm">{c.name}</span>
                  <div className="flex items-center gap-2">
                    {c.pinned && (
                      <Badge variant="secondary">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/labs/${lab.id}/collections`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                collectionId: c.id,
                                pinned: !c.pinned,
                              }),
                            });
                            if (!res.ok) console.error("Failed to update pin");
                          } catch {
                            console.error("Failed to update pin");
                          }
                          router.refresh();
                        }}
                      >
                        {c.pinned ? "Unpin" : "Pin"}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
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
