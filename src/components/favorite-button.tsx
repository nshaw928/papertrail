"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  collectionType: "personal" | "lab";
  collectionId: string;
  initialFavorited?: boolean;
  size?: "sm" | "default";
}

export default function FavoriteButton({
  collectionType,
  collectionId,
  initialFavorited = false,
  size = "sm",
}: FavoriteButtonProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const method = favorited ? "DELETE" : "POST";
    setFavorited(!favorited);

    try {
      const res = await fetch("/api/favorites", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collection_type: collectionType,
          collection_id: collectionId,
        }),
      });
      if (!res.ok) {
        setFavorited(favorited); // revert
      } else {
        router.refresh();
      }
    } catch {
      setFavorited(favorited); // revert
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size={size === "sm" ? "icon-xs" : "sm"}
      onClick={toggle}
      disabled={loading}
      title={favorited ? "Remove from sidebar" : "Pin to sidebar"}
    >
      <Star
        className={cn(
          "h-4 w-4",
          favorited ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground"
        )}
      />
    </Button>
  );
}
