"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SaveButtonProps {
  workId: string;
  initialSaved?: boolean;
  size?: "sm" | "lg";
}

export default function SaveButton({
  workId,
  initialSaved = false,
  size = "sm",
}: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [loading, setLoading] = useState(false);
  const [limitMessage, setLimitMessage] = useState<string | null>(null);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setLimitMessage(null);
    try {
      if (saved) {
        await fetch(`/api/papers/${workId}/save`, { method: "DELETE" });
        setSaved(false);
      } else {
        const res = await fetch(`/api/papers/${workId}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        if (res.status === 429) {
          const data = await res.json();
          setLimitMessage(data.error ?? "Save limit reached");
          return;
        }
        setSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <Button
        variant={saved ? "default" : "outline"}
        size={size === "lg" ? "default" : "sm"}
        onClick={handleToggle}
        disabled={loading}
        title={saved ? "Remove from library" : "Save to library"}
      >
        {saved ? "★ Saved" : "☆ Save"}
      </Button>
      {limitMessage && (
        <span className="text-xs text-destructive max-w-48 text-right">
          {limitMessage}
        </span>
      )}
    </div>
  );
}
