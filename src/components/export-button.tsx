"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ExportButtonProps {
  scope: "library" | "collection";
  collectionId?: string;
  canExport: boolean;
}

export default function ExportButton({
  scope,
  collectionId,
  canExport,
}: ExportButtonProps) {
  if (!canExport) {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2" asChild>
        <Link href="/pricing" className="pointer-events-auto">
          <Download className="h-4 w-4" />
          Export CSV
          <span className="text-xs text-muted-foreground">(Upgrade)</span>
        </Link>
      </Button>
    );
  }

  const params = new URLSearchParams({ scope });
  if (scope === "collection" && collectionId) {
    params.set("id", collectionId);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => {
        window.location.href = `/api/export?${params.toString()}`;
      }}
    >
      <Download className="h-4 w-4" />
      Export CSV
    </Button>
  );
}
