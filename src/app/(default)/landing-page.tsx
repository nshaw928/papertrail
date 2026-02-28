"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Network, FolderOpen, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: Search,
    title: "Search",
    description:
      "Search across 250M+ academic papers with fast, relevant results powered by OpenAlex.",
  },
  {
    icon: Network,
    title: "Citation Graphs",
    description:
      "Visualize citation networks to discover connections and trace the evolution of ideas.",
  },
  {
    icon: FolderOpen,
    title: "Collections",
    description:
      "Organize papers into collections for easy reference across projects and topics.",
  },
  {
    icon: FlaskConical,
    title: "Lab Collaboration",
    description:
      "Share collections, run journal clubs, and collaborate with your research group.",
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    setMessage(null);

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await res.json();
    setMessage(data.message || data.error || "Something went wrong");
    if (res.ok) setEmail("");
    setSubmitting(false);
  }

  return (
    <div className="flex flex-col items-center pt-12 md:pt-20 max-w-2xl mx-auto px-4">
      <div className="space-y-6 text-center">
        <div className="space-y-3">
          <Badge variant="outline" className="text-xs">
            alpha
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">Papertrail</h1>
          <p className="text-lg text-muted-foreground">
            A modern research tool for exploring, organizing, and understanding
            academic literature. Search 250M+ papers, build citation graphs, and
            collaborate with your lab.
          </p>
        </div>

        {/* Waitlist form */}
        <form onSubmit={handleWaitlist} className="space-y-3 max-w-md mx-auto">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="you@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1"
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? "..." : "Join Waitlist"}
            </Button>
          </div>
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}
        </form>

        {/* Login link */}
        <p className="text-sm text-muted-foreground">
          Already have access?{" "}
          <Link
            href="/login"
            className="text-primary hover:underline font-medium"
          >
            Log in
          </Link>
        </p>
      </div>

      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-2 w-full mt-12">
        {features.map((f) => (
          <Card key={f.title}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <f.icon className="h-4 w-4 text-primary" />
                {f.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
