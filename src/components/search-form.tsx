"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PaperCard from "./paper-card";
import Pagination from "./pagination";
import type { SearchResult } from "@/lib/types/app";

export default function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const search = useCallback(
    async (page: number) => {
      if (!query.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(
          `/api/openalex/search?q=${encodeURIComponent(query)}&page=${page}&per_page=20`
        );
        if (!resp.ok) throw new Error("Search failed");
        const data: SearchResult = await resp.json();
        setResults(data);
        setCurrentPage(page);
      } catch {
        setError("Search failed. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [query]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(1);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search papers, authors, topics..."
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {results && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {results.count.toLocaleString()} results
          </p>
          {results.results.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
          <Pagination
            page={currentPage}
            totalCount={results.count}
            perPage={results.per_page}
            onPageChange={search}
          />
        </div>
      )}
    </div>
  );
}
