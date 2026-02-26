"use client";

import { ChevronDown, Download } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          Export
          <span className="text-xs text-muted-foreground">(Upgrade)</span>
        </Link>
      </Button>
    );
  }

  function buildUrl(format: "csv" | "bibtex") {
    const params = new URLSearchParams({ scope, format });
    if (scope === "collection" && collectionId) {
      params.set("id", collectionId);
    }
    return `/api/export?${params.toString()}`;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => (window.location.href = buildUrl("csv"))}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => (window.location.href = buildUrl("bibtex"))}>
          Export as BibTeX
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
