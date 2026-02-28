"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Users,
  FolderOpen,
  CheckCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Step = "name" | "invite" | "collection" | "done";

export default function LabSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("name");
  const [labName, setLabName] = useState("");
  const [emails, setEmails] = useState("");
  const [collectionName, setCollectionName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [labId, setLabId] = useState<string | null>(null);

  async function handleCreateLab() {
    if (!labName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: labName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create lab");
        return;
      }
      const lab = await res.json();
      setLabId(lab.id);
      setStep("invite");
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite() {
    if (!labId) return;
    setLoading(true);
    setError(null);
    try {
      const emailList = emails
        .split(/[,\n]/)
        .map((e) => e.trim())
        .filter(Boolean);

      const results = await Promise.allSettled(
        emailList.map((email) =>
          fetch(`/api/labs/${labId}/members`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        setError(`${failed} of ${emailList.length} invitations failed`);
      }
      setStep("collection");
    } catch {
      setError("Some invitations may have failed");
      setStep("collection");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCollection() {
    if (!labId || !collectionName.trim()) {
      setStep("done");
      return;
    }
    setLoading(true);
    try {
      await fetch(`/api/labs/${labId}/collections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: collectionName.trim() }),
      });
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
      setStep("done");
    }
  }

  const steps = [
    { key: "name", icon: FlaskConical, label: "Name your lab" },
    { key: "invite", icon: Users, label: "Invite members" },
    { key: "collection", icon: FolderOpen, label: "First collection" },
    { key: "done", icon: CheckCircle, label: "All set!" },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="max-w-lg mx-auto space-y-6 py-8">
      {/* Progress */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          return (
            <div
              key={s.key}
              className={`flex items-center gap-1.5 text-sm ${
                isActive
                  ? "text-foreground font-medium"
                  : isDone
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{s.label}</span>
              {i < steps.length - 1 && (
                <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground/30" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      {step === "name" && (
        <Card>
          <CardHeader>
            <CardTitle>Name Your Lab</CardTitle>
            <CardDescription>
              This will be visible to all lab members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="e.g. Smith Lab, Computational Biology Group"
              maxLength={200}
              autoFocus
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full"
              onClick={handleCreateLab}
              disabled={loading || !labName.trim()}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </CardContent>
        </Card>
      )}

      {step === "invite" && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Your Team</CardTitle>
            <CardDescription>
              Add email addresses separated by commas or new lines.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder={"alice@university.edu\nbob@university.edu"}
              rows={4}
              disabled={loading}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("collection")}
                disabled={loading}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={handleInvite}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "collection" && (
        <Card>
          <CardHeader>
            <CardTitle>Create Your First Collection</CardTitle>
            <CardDescription>
              A shared collection for your lab to organize papers together.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g. Key Papers, Reading List"
              maxLength={200}
              autoFocus
              disabled={loading}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("done")}
                disabled={loading}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreateCollection}
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "done" && (
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold">You&apos;re all set!</h2>
          <p className="text-muted-foreground">
            Your lab is ready. Start exploring papers and collaborating.
          </p>
          <Button size="lg" onClick={() => router.push("/lab")}>
            Go to Lab Dashboard
          </Button>
        </div>
      )}
    </div>
  );
}
