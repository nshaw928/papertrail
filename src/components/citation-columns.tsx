"use client";

import { useState } from "react";
import Link from "next/link";
import SaveButton from "@/components/save-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  citedBy,
  citedByTotal,
}: CitationColumnsProps) {
  return (
    <Tabs defaultValue="references">
      <TabsList>
        <TabsTrigger value="references">
          References ({references.length})
        </TabsTrigger>
        <TabsTrigger value="cited-by">
          Cited By ({citedByTotal})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="references" className="space-y-2 mt-4">
        {references.length > 0 ? (
          references.map((paper) => (
            <CitationCard key={paper.id} paper={paper} />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No references found</p>
        )}
      </TabsContent>

      <TabsContent value="cited-by" className="space-y-2 mt-4">
        {citedBy.length > 0 ? (
          <>
            {citedBy.map((paper) => (
              <CitationCard key={paper.id} paper={paper} />
            ))}
            {citedByTotal > citedBy.length && (
              <p className="text-xs text-muted-foreground pt-2">
                Showing {citedBy.length} of {citedByTotal.toLocaleString()} citing papers
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            No citing papers found
          </p>
        )}
      </TabsContent>
    </Tabs>
  );
}
