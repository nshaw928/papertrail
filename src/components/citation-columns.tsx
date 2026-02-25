"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import SaveButton from "@/components/save-button";
import type { WorkWithRelations } from "@/lib/types/app";

function CitationCard({ paper }: { paper: WorkWithRelations }) {
  const isStub = paper.is_stub || paper.title === "Unknown";
  const displayTitle = isStub ? "Untitled paper" : paper.title;

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 flex-1 space-y-1">
        <Link
          href={`/paper/${paper.id}`}
          className={`text-sm font-medium leading-snug hover:underline line-clamp-2${isStub ? " italic text-muted-foreground" : ""}`}
        >
          {displayTitle}
        </Link>
        {paper.authors.length > 0 && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {paper.authors
              .slice(0, 3)
              .map((a) => a.display_name)
              .join(", ")}
            {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {paper.year && <span>{paper.year}</span>}
          {!isStub && (
            <span>{(paper.cited_by_count ?? 0).toLocaleString()} citations</span>
          )}
        </div>
      </div>
      <SaveButton
        workId={paper.id}
        initialSaved={paper.is_saved ?? false}
        size="sm"
      />
    </div>
  );
}

interface CitationColumnsProps {
  references: WorkWithRelations[];
  citedBy: WorkWithRelations[];
  citedByTotal: number;
}

export default function CitationColumns({
  references,
  citedBy: initialCitedBy,
  citedByTotal,
}: CitationColumnsProps) {
  const [citedBy] = useState(initialCitedBy);
  const [citedByPage] = useState(1);
  const perPage = 20;
  const totalPages = Math.ceil(citedByTotal / perPage);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* References */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">
          References ({references.length})
        </h3>
        {references.length > 0 ? (
          <div className="space-y-2">
            {references.map((paper) => (
              <CitationCard key={paper.id} paper={paper} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No references found</p>
        )}
      </div>

      {/* Cited By */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">
          Cited By ({citedByTotal})
        </h3>
        {citedBy.length > 0 ? (
          <div className="space-y-2">
            {citedBy.map((paper) => (
              <CitationCard key={paper.id} paper={paper} />
            ))}
            {totalPages > 1 && (
              <p className="text-xs text-muted-foreground pt-2">
                Showing page {citedByPage} of {totalPages}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No citing papers found
          </p>
        )}
      </div>
    </div>
  );
}
