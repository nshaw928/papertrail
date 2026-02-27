import { NextRequest, NextResponse } from "next/server";
import { searchWorks } from "@/lib/openalex/client";
import { ingestWorks } from "@/lib/openalex/ingest";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiUser } from "@/lib/supabase/server";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import { checkLimit } from "@/lib/supabase/plans";
import { computeQueryHash, isCacheStale } from "@/lib/search-cache";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = parseInt(searchParams.get("per_page") ?? "20", 10);
  const fromYear = searchParams.get("from_year");
  const toYear = searchParams.get("to_year");
  const sort = searchParams.get("sort");

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // Require auth — unauthenticated users can't search (costs money)
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Check search rate limit
  const limit = await checkLimit(supabase, user.id, "search");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.reason, code: "LIMIT_REACHED" },
      { status: 429 }
    );
  }

  const admin = createAdminClient();
  const fromYearNum = fromYear ? parseInt(fromYear, 10) : undefined;
  const toYearNum = toYear ? parseInt(toYear, 10) : undefined;

  try {
    // Only cache page 1
    if (page === 1) {
      const hash = computeQueryHash(query, fromYearNum ?? null, toYearNum ?? null, sort);

      const { data: cached } = await admin
        .from("search_cache")
        .select("*")
        .eq("query_hash", hash)
        .single();

      if (cached && !isCacheStale(cached.refreshed_at)) {
        // Cache hit — serve from local DB
        const workIds = cached.work_ids;
        const { data: works } = await admin
          .from("works")
          .select("*")
          .in("id", workIds);

        const hydrated = await loadWorksWithRelations(supabase, works ?? [], {
          userId: user.id,
        });

        // Re-sort to match cached order
        const orderMap = new Map(workIds.map((wid, i) => [wid, i]));
        hydrated.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

        // Cache hits still count against daily limit
        await admin.rpc("increment_usage", {
          target_user_id: user.id,
          field: "search_count",
        });

        return NextResponse.json({
          results: hydrated,
          count: cached.result_count,
          page,
          per_page: perPage,
        });
      }
    }

    // Cache miss or page > 1 — call OpenAlex
    const { results: openalexResults, meta } = await searchWorks(
      query,
      page,
      perPage,
      {
        fromYear: fromYearNum,
        toYear: toYearNum,
        sort: sort ?? undefined,
      }
    );

    const ingested = await ingestWorks(admin, openalexResults);

    // Upsert search_cache for page 1
    if (page === 1) {
      const hash = computeQueryHash(query, fromYearNum ?? null, toYearNum ?? null, sort);
      const workIds = ingested.map((w) => w.id as string);

      await admin
        .from("search_cache")
        .upsert(
          {
            query_hash: hash,
            query: query.trim(),
            from_year: fromYearNum ?? null,
            to_year: toYearNum ?? null,
            sort: sort ?? null,
            work_ids: workIds,
            result_count: (meta.count as number) ?? 0,
            refreshed_at: new Date().toISOString(),
          },
          { onConflict: "query_hash" }
        );
    }

    // Track usage
    await admin.rpc("increment_usage", {
      target_user_id: user.id,
      field: "search_count",
    });

    const results = await loadWorksWithRelations(supabase, ingested, {
      userId: user.id,
    });

    return NextResponse.json({
      results,
      count: (meta.count as number) ?? 0,
      page,
      per_page: perPage,
    });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
