"use client";

import { useEffect, useState } from "react";
import type { InviteLink } from "@/lib/types/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Copy, Check } from "lucide-react";

export default function InviteManager() {
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/invites")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setInvites(data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    setCreating(true);
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim() || undefined,
        expires_in_days: 7,
      }),
    });
    if (res.ok) {
      const invite = await res.json();
      setInvites((prev) => [invite, ...prev]);
      setEmail("");
    }
    setCreating(false);
  }

  function getInviteUrl(code: string) {
    return `${window.location.origin}/login?invite=${code}`;
  }

  function getStatus(invite: InviteLink) {
    if (invite.used_by) return "used";
    if (new Date(invite.expires_at) < new Date()) return "expired";
    return "active";
  }

  async function copyToClipboard(invite: InviteLink) {
    await navigator.clipboard.writeText(getInviteUrl(invite.code));
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Links</CardTitle>
        <CardDescription>
          Generate invite links to let new users sign up.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleGenerate} disabled={creating} size="sm">
            {creating ? "..." : "Generate"}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : invites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invites generated yet.</p>
        ) : (
          <div className="space-y-2">
            {invites.map((invite) => {
              const status = getStatus(invite);
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <code className="text-xs truncate">
                        {invite.code.slice(0, 8)}...
                      </code>
                      <Badge
                        variant={
                          status === "active"
                            ? "default"
                            : status === "used"
                              ? "secondary"
                              : "destructive"
                        }
                        className="text-[10px]"
                      >
                        {status}
                      </Badge>
                    </div>
                    {invite.email && (
                      <p className="text-xs text-muted-foreground truncate">
                        {invite.email}
                      </p>
                    )}
                  </div>
                  {status === "active" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(invite)}
                      className="shrink-0"
                    >
                      {copiedId === invite.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
