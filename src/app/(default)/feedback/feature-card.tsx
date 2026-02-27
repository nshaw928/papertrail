"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lock, ThumbsUp } from "lucide-react";
import type { Feature, FeatureComment } from "@/lib/types/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-blue-500/10 text-blue-500",
  in_progress: "bg-yellow-500/10 text-yellow-500",
  shipped: "bg-green-500/10 text-green-500",
  considering: "bg-purple-500/10 text-purple-500",
};

const STATUS_LABELS: Record<string, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  shipped: "Shipped",
  considering: "Considering",
};

interface FeatureCardProps {
  feature: Feature;
  userId: string | null;
  userEmail: string | null;
  isPaid: boolean;
  onUpvoteToggle: (featureId: string, upvoted: boolean) => void;
}

export default function FeatureCard({
  feature,
  userId,
  userEmail,
  isPaid,
  onUpvoteToggle,
}: FeatureCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<FeatureComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [voting, setVoting] = useState(false);

  async function toggleExpand() {
    if (!expanded && comments.length === 0) {
      setLoadingComments(true);
      const res = await fetch(`/api/features/${feature.id}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
      setLoadingComments(false);
    }
    setExpanded(!expanded);
  }

  async function handleUpvote() {
    if (!userId) return;
    if (!isPaid) return;
    setVoting(true);

    const res = await fetch(`/api/features/${feature.id}/upvote`, {
      method: "POST",
    });

    if (res.ok) {
      const { upvoted } = await res.json();
      onUpvoteToggle(feature.id, upvoted);
    }

    setVoting(false);
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentContent.trim() || !userId) return;
    setSubmittingComment(true);

    const res = await fetch(`/api/features/${feature.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: commentContent.trim() }),
    });

    if (res.ok) {
      const comment = await res.json();
      setComments((prev) => [...prev, comment]);
      setCommentContent("");
    }

    setSubmittingComment(false);
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-3">
          {/* Upvote button */}
          <div className="flex flex-col items-center">
            <Button
              variant={feature.user_has_upvoted ? "default" : "outline"}
              size="sm"
              className="h-auto flex-col gap-0.5 px-2 py-1.5"
              onClick={handleUpvote}
              disabled={voting || !userId || !isPaid}
              title={
                !userId
                  ? "Sign in to vote"
                  : !isPaid
                    ? "Upgrade to vote"
                    : feature.user_has_upvoted
                      ? "Remove vote"
                      : "Upvote"
              }
            >
              {!userId || !isPaid ? (
                <Lock className="h-3.5 w-3.5" />
              ) : (
                <ThumbsUp className="h-3.5 w-3.5" />
              )}
              <span className="text-xs font-medium">{feature.upvote_count}</span>
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{feature.title}</h3>
              <Badge
                variant="secondary"
                className={`shrink-0 text-xs ${STATUS_COLORS[feature.status] ?? ""}`}
              >
                {STATUS_LABELS[feature.status] ?? feature.status}
              </Badge>
            </div>

            {feature.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.description}
              </p>
            )}

            <button
              onClick={toggleExpand}
              className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              Comments
            </button>

            {expanded && (
              <div className="mt-3 space-y-3 border-t pt-3">
                {loadingComments ? (
                  <p className="text-xs text-muted-foreground">Loading...</p>
                ) : comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No comments yet</p>
                ) : (
                  comments.map((c) => (
                    <div key={c.id} className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">
                          {c.user_email.split("@")[0]}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm">{c.content}</p>
                    </div>
                  ))
                )}

                {userId && (
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      rows={1}
                      className="min-h-[36px] text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submittingComment || !commentContent.trim()}
                    >
                      Post
                    </Button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
