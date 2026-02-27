"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bookmark, X } from "lucide-react";
import PaperCard from "./paper-card";
import Pagination from "./pagination";
import UpgradePrompt from "./upgrade-prompt";
import type { SearchResult, SavedSearch } from "@/lib/types/app";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

const SORT_LABELS: Record<string, string> = {
  newest: "Newest",
  cited_by_count: "Most Cited",
  oldest: "Oldest",
};

function formatFilters(s: SavedSearch): string {
  const parts: string[] = [];

  if (s.from_year != null || s.to_year != null) {
    const from = s.from_year != null ? String(s.from_year) : "\u2026";
    const to = s.to_year != null ? String(s.to_year) : "\u2026";
    parts.push(`${from}\u2013${to}`);
  }

  if (s.sort && SORT_LABELS[s.sort]) {
    parts.push(SORT_LABELS[s.sort]);
  }

  return parts.length > 0 ? parts.join(" \u00B7 ") : "";
}

interface SearchFormProps {
  savedSearches?: SavedSearch[];
}

export default function SearchForm({ savedSearches: initialSaved = [] }: SearchFormProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [limitReached, setLimitReached] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [fromYear, setFromYear] = useState("");
  const [toYear, setToYear] = useState("");
  const [sort, setSort] = useState("relevance");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(initialSaved);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState<string | null>(null);

  const search = useCallback(
    async (page: number) => {
      if (!query.trim()) return;
      setLoading(true);
      setError(null);
      setLimitReached(null);
      setSavedId(null);
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
        if (resp.status === 401) {
          setError("Sign in to search papers.");
          return;
        }
        if (resp.status === 429) {
          const data = await resp.json();
          setLimitReached(data.error ?? "Daily search limit reached.");
          return;
        }
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

  const saveSearch = async () => {
    if (!results || savedId || saving) return;
    setSaving(true);
    try {
      const resp = await fetch("/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          work_ids: results.results.map((r) => r.id),
          result_count: results.count,
          from_year: fromYear ? Number(fromYear) : null,
          to_year: toYear ? Number(toYear) : null,
          sort: sort !== "relevance" ? sort : null,
        }),
      });
      if (!resp.ok) return;
      const saved: SavedSearch = await resp.json();
      setSavedId(saved.id);
      setSavedSearches((prev) => [saved, ...prev].slice(0, 10));
    } finally {
      setSaving(false);
    }
  };

  const loadSavedSearch = async (id: string) => {
    setLoadingSaved(id);
    setError(null);
    try {
      const resp = await fetch(`/api/searches/${id}`);
      if (!resp.ok) throw new Error("Failed to load");
      const data = await resp.json();
      setQuery(data.query);
      setFromYear(data.from_year != null ? String(data.from_year) : "");
      setToYear(data.to_year != null ? String(data.to_year) : "");
      setSort(data.sort ?? "relevance");
      setResults({
        results: data.results,
        count: data.count,
        page: 1,
        per_page: data.results.length,
      });
      setCurrentPage(1);
      setSavedId(id);
    } catch {
      setError("Failed to load saved search.");
    } finally {
      setLoadingSaved(null);
    }
  };

  const deleteSavedSearch = async (id: string) => {
    await fetch(`/api/searches/${id}`, { method: "DELETE" });
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    if (savedId === id) setSavedId(null);
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

      {limitReached && <UpgradePrompt message={limitReached} />}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {results && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              {results.count.toLocaleString()} results
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={savedId ? undefined : saveSearch}
              disabled={saving || !!savedId}
              className="h-7 px-2"
            >
              <Bookmark className={`h-4 w-4${savedId ? " fill-current" : ""}`} />
              <span className="ml-1 text-xs">
                {saving ? "Saving..." : savedId ? "Saved" : "Save"}
              </span>
            </Button>
          </div>
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

      {savedSearches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Saved Searches</h3>
          <div className="space-y-1">
            {savedSearches.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <button
                  className="flex-1 text-left truncate hover:underline"
                  onClick={() => loadSavedSearch(s.id)}
                  disabled={loadingSaved === s.id}
                >
                  {loadingSaved === s.id ? (
                    "Loading..."
                  ) : (
                    <>
                      <span className="font-medium">{s.query}</span>
                      {formatFilters(s) && (
                        <span className="text-muted-foreground"> · {formatFilters(s)}</span>
                      )}
                    </>
                  )}
                </button>
                <Badge variant="secondary" className="shrink-0">
                  {s.result_count.toLocaleString()}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(s.created_at)}
                </span>
                <button
                  onClick={() => deleteSavedSearch(s.id)}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
