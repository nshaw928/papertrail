"use client";

import { useState } from "react";
import type { Feature, FeedbackCategory } from "@/lib/types/app";
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import FeatureCard from "./feature-card";

interface FeatureBoardProps {
  initialFeatures: Feature[];
  userId: string | null;
  userEmail: string | null;
  userPlan: string | null;
  isAdmin?: boolean;
}

export default function FeatureBoard({
  initialFeatures,
  userId,
  userEmail,
  userPlan,
  isAdmin: admin = false,
}: FeatureBoardProps) {
  const [features, setFeatures] = useState(initialFeatures);
  const [sort, setSort] = useState<"votes" | "newest">("votes");
  const [showAddFeature, setShowAddFeature] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [addingFeature, setAddingFeature] = useState(false);

  // Feedback form state
  const [feedbackContent, setFeedbackContent] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("general");
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const isPaid = userPlan === "researcher" || userPlan === "lab";

  const sorted = [...features].sort((a, b) => {
    if (sort === "votes") return b.upvote_count - a.upvote_count;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  async function handleAddFeature() {
    if (!newTitle.trim()) return;
    setAddingFeature(true);

    const res = await fetch("/api/features", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
      }),
    });

    if (res.ok) {
      const feature = await res.json();
      setFeatures((prev) => [{ ...feature, user_has_upvoted: false }, ...prev]);
      setNewTitle("");
      setNewDescription("");
      setShowAddFeature(false);
    }

    setAddingFeature(false);
  }

  function handleUpvoteToggle(featureId: string, upvoted: boolean) {
    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
          ? {
              ...f,
              user_has_upvoted: upvoted,
              upvote_count: f.upvote_count + (upvoted ? 1 : -1),
            }
          : f
      )
    );
  }

  async function handleFeedbackSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!feedbackContent.trim()) return;
    setFeedbackSubmitting(true);
    setFeedbackMessage(null);

    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: feedbackContent.trim(),
        category: feedbackCategory,
        email: feedbackEmail || undefined,
      }),
    });

    if (res.ok) {
      setFeedbackContent("");
      setFeedbackEmail("");
      setFeedbackMessage("Thanks for your feedback!");
    } else {
      setFeedbackMessage("Failed to submit. Please try again.");
    }

    setFeedbackSubmitting(false);
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Feedback & Features</h1>
        <p className="text-muted-foreground">
          Vote on features you want to see and share your thoughts on Papertrail.
        </p>
      </div>

      {/* Feature Board */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Feature Board</h2>
          <div className="flex items-center gap-2">
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as "votes" | "newest")}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="votes">Most Votes</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
              </SelectContent>
            </Select>
            {admin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddFeature(!showAddFeature)}
              >
                Add Feature
              </Button>
            )}
          </div>
        </div>

        {showAddFeature && admin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New Feature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Feature title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleAddFeature}
                  disabled={addingFeature || !newTitle.trim()}
                >
                  {addingFeature ? "Creating..." : "Create"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAddFeature(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No features posted yet. Check back soon!
          </p>
        ) : (
          <div className="space-y-3">
            {sorted.map((feature) => (
              <FeatureCard
                key={feature.id}
                feature={feature}
                userId={userId}
                userEmail={userEmail}
                isPaid={isPaid}
                onUpvoteToggle={handleUpvoteToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Feedback Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Feedback</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <Select
              value={feedbackCategory}
              onValueChange={(v) => setFeedbackCategory(v as FeedbackCategory)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature_request">Feature Request</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Textarea
              placeholder="What's on your mind?"
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              rows={4}
              required
            />

            {!userId && (
              <Input
                type="email"
                placeholder="Your email (optional)"
                value={feedbackEmail}
                onChange={(e) => setFeedbackEmail(e.target.value)}
              />
            )}

            {feedbackMessage && (
              <p className={`text-sm ${feedbackMessage.includes("Thanks") ? "text-green-600" : "text-destructive"}`}>
                {feedbackMessage}
              </p>
            )}

            <Button type="submit" disabled={feedbackSubmitting || !feedbackContent.trim()}>
              {feedbackSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
