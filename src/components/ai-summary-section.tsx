"use client";

import { useState, useEffect, useRef } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AISummarySectionProps {
  workId: string;
  initialSummary: string | null;
  canGenerate: boolean;
  hasText: boolean;
}

type Status = "idle" | "queued" | "polling" | "completed" | "failed";

export default function AISummarySection({
  workId,
  initialSummary,
  canGenerate,
  hasText,
}: AISummarySectionProps) {
  const [summary, setSummary] = useState(initialSummary);
  const [status, setStatus] = useState<Status>(initialSummary ? "completed" : "idle");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startPolling() {
    if (intervalRef.current) return;
    setStatus("polling");

    intervalRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/papers/${workId}/summarize`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "completed") {
          setSummary(data.ai_summary);
          setStatus("completed");
          stopPolling();
        } else if (data.status === "failed") {
          setError(data.error ?? "Summary generation failed");
          setStatus("failed");
          stopPolling();
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
        setSummary(data.ai_summary);
        setStatus("completed");
      } else {
        startPolling();
      }
    } catch {
      setError("Network error");
      setStatus("failed");
    }
  }

  // Nothing to show
  if (status === "idle" && (!canGenerate || !hasText)) {
    return null;
  }

  return (
    <section className="space-y-2">
      {status !== "idle" && (
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          AI Summary
        </h2>
      )}

      {status === "completed" && summary && (
        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
          {summary}
        </p>
      )}

      {(status === "queued" || status === "polling") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating summary...
        </div>
      )}

      {status === "failed" && (
        <>
          <p className="text-sm text-destructive">{error}</p>
          {canGenerate && (
            <Button variant="outline" size="sm" onClick={handleGenerate}>
              Retry
            </Button>
          )}
        </>
      )}

      {status === "idle" && (
        <Button variant="outline" size="sm" onClick={handleGenerate}>
          <Sparkles className="mr-2 h-4 w-4" />
          Generate AI Summary
        </Button>
      )}
    </section>
  );
}
