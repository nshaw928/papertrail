"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
    <div className="flex flex-col md:flex-row gap-10 md:gap-12 items-center md:items-start pt-8 md:pt-16">
      {/* Left column — 1/3 */}
      <div className="w-full md:w-1/3 space-y-6 text-center md:text-left">
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
        <form onSubmit={handleWaitlist} className="space-y-3">
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

        {/* Skip the line */}
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <div className="h-px flex-1 bg-border" />
            <span>or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <p className="text-sm text-muted-foreground">
            Want to support development and get immediate access?{" "}
            <Link
              href="/pricing"
              className="text-primary hover:underline font-medium"
            >
              See our plans
            </Link>
          </p>
        </div>
      </div>

      {/* Right column — 2/3 */}
      <div className="w-full md:w-2/3">
        <div className="aspect-[16/10] rounded-lg border bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 flex items-center justify-center">
          <div className="text-center space-y-2 text-muted-foreground">
            <p className="text-sm">App Preview</p>
            <p className="text-xs">Screenshot coming soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
