"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaperCard from "./paper-card";
import Pagination from "./pagination";
import type { SearchResult } from "@/lib/types/app";

export default function SearchForm() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [sort, setSort] = useState("relevance");

  const search = useCallback(
    async (page: number) => {
      if (!query.trim()) return;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: query,
          page: String(page),
          per_page: "20",
        });
        if (fromYear) params.set("from_year", fromYear);
        if (toYear) params.set("to_year", toYear);
        if (sort && sort !== "relevance") params.set("sort", sort);

        const resp = await fetch(`/api/openalex/search?${params}`);
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
    [query, fromYear, toYear, sort]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    search(1);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
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
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground whitespace-nowrap">Year</label>
            <Input
              type="number"
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              placeholder="From"
              className="w-24"
              min={1900}
              max={2099}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              value={toYear}
              onChange={(e) => setToYear(e.target.value)}
              placeholder="To"
              className="w-24"
              min={1900}
              max={2099}
            />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="cited_by_count">Most Cited</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
