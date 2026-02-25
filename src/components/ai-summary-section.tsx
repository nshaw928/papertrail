"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface AISummarySectionProps {
  workId: string;
  initialSummary: string | null;
  initialTags: string[] | null;
  canGenerate: boolean;
}

type Status = "idle" | "queued" | "polling" | "completed" | "failed";

export default function AISummarySection({
  workId,
  initialSummary,
  initialTags,
  canGenerate,
}: AISummarySectionProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [tags, setTags] = useState(initialTags);
  const [status, setStatus] = useState<Status>(initialSummary ? "completed" : "idle");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function startPolling() {
    if (intervalRef.current) return;
    setStatus("polling");

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/papers/${workId}/summarize`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "completed") {
          setSummary(data.summary);
          setTags(data.ai_tags);
          setStatus("completed");
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        } else if (data.status === "failed") {
          setError(data.error ?? "Summary generation failed");
          setStatus("failed");
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Silently retry on network error
      }
    }, 5000);
  }

  async function handleGenerate() {
    setStatus("queued");
    setError(null);

    try {
      const res = await fetch(`/api/papers/${workId}/summarize`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        setStatus("failed");
        return;
      }

      if (data.status === "completed") {
        setSummary(data.summary);
        setTags(data.ai_tags);
        setStatus("completed");
      } else {
        startPolling();
      }
    } catch {
      setError("Network error");
      setStatus("failed");
    }
  }

  if (status === "completed" && summary) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Summary
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {summary}
        </p>
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs border-violet-500/50 text-violet-600 dark:text-violet-400"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </section>
    );
  }

  if (status === "queued" || status === "polling") {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Summary
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating summary...
        </div>
      </section>
    );
  }

  if (status === "failed") {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Summary
        </h2>
        <p className="text-sm text-destructive">{error}</p>
        {canGenerate && (
          <Button variant="outline" size="sm" onClick={handleGenerate}>
            Retry
          </Button>
        )}
      </section>
    );
  }

  // idle state
  if (!canGenerate) {
    return null;
  }

  return (
    <section className="space-y-2">
      <Button variant="outline" size="sm" onClick={handleGenerate}>
        <Sparkles className="mr-2 h-4 w-4" />
        Generate AI Summary
      </Button>
    </section>
  );
}
