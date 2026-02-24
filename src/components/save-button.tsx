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

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      if (saved) {
        await fetch(`/api/papers/${workId}/save`, { method: "DELETE" });
        setSaved(false);
      } else {
        await fetch(`/api/papers/${workId}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        setSaved(true);
      }
    } catch (err) {
      console.error("Failed to toggle save:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size={size === "lg" ? "default" : "sm"}
      onClick={handleToggle}
      disabled={loading}
      title={saved ? "Remove from library" : "Save to library"}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </Button>
  );
}
