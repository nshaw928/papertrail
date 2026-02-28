"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [institution, setInstitution] = useState("");
  const [labSize, setLabSize] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/labs/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          institution: institution.trim(),
          lab_size: labSize,
          message: message.trim(),
        }),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to submit. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 space-y-4">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h1 className="text-2xl font-bold">Thanks for reaching out!</h1>
        <p className="text-muted-foreground">
          We&apos;ll be in touch within 24 hours.
        </p>
        <Button variant="outline" asChild>
          <Link href="/pricing">Back to Pricing</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <Link
        href="/pricing"
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pricing
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>Talk to Us</CardTitle>
          <CardDescription>
            Interested in the Lab plan for your research group? Tell us about
            your needs and we&apos;ll help you get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email *</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                required
                disabled={submitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Institution</label>
              <Input
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                placeholder="University or organization"
                disabled={submitting}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Lab Size</label>
              <Select value={labSize} onValueChange={setLabSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select lab size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2-10">2-10 members</SelectItem>
                  <SelectItem value="10-25">10-25 members</SelectItem>
                  <SelectItem value="25-50">25-50 members</SelectItem>
                  <SelectItem value="50+">50+ members</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about your lab and how you plan to use Papertrail..."
                rows={4}
                maxLength={5000}
                disabled={submitting}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || !name.trim() || !email.trim()}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
