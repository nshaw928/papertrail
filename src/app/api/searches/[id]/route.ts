import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import { searchWorks } from "@/lib/openalex/client";
import { ingestWorks } from "@/lib/openalex/ingest";
import { isCacheStale } from "@/lib/search-cache";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid search ID" }, { status: 400 });
  }

  const { data: savedSearch, error } = await supabase
    .from("saved_searches")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !savedSearch) {
    return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
  }

  let workIds = savedSearch.work_ids;
  let resultCount = savedSearch.result_count;

  // If cache_id is set, try to use cache (and refresh if needed)
  if (savedSearch.cache_id) {
    const admin = createAdminClient();

    const { data: cache } = await admin
      .from("search_cache")
      .select("*")
      .eq("id", savedSearch.cache_id)
      .single();

    if (cache) {
      // For "newest" sort, refresh if stale (> 24 hours)
      if (savedSearch.sort === "newest" && isCacheStale(cache.refreshed_at, 24)) {
        try {
          const { results: openalexResults, meta } = await searchWorks(
            cache.query,
            1,
            20,
            {
              fromYear: cache.from_year ?? undefined,
              toYear: cache.to_year ?? undefined,
              sort: cache.sort ?? undefined,
            }
          );

          const ingested = await ingestWorks(admin, openalexResults);
          const freshIds = ingested.map((w) => w.id as string);

          await admin
            .from("search_cache")
            .update({
              work_ids: freshIds,
              result_count: (meta.count as number) ?? 0,
              refreshed_at: new Date().toISOString(),
            })
            .eq("id", cache.id);

          workIds = freshIds;
          resultCount = (meta.count as number) ?? cache.result_count;
        } catch (err) {
          // Refresh failed — serve stale data
          console.error("Failed to refresh newest saved search:", err);
          workIds = cache.work_ids;
          resultCount = cache.result_count;
        }
      } else {
        // Use cached work_ids
        workIds = cache.work_ids;
        resultCount = cache.result_count;
      }
    }
    // If cache row missing (deleted), fall through to saved_searches.work_ids
  }

  if (workIds.length === 0) {
    return NextResponse.json({
      results: [],
      count: resultCount,
      query: savedSearch.query,
      from_year: savedSearch.from_year,
      to_year: savedSearch.to_year,
      sort: savedSearch.sort,
    });
  }

  const { data: works } = await supabase
    .from("works")
    .select("*")
    .in("id", workIds);

  const hydrated = await loadWorksWithRelations(supabase, works ?? [], { userId: user.id });

  // Re-sort to match work_ids order
  const orderMap = new Map(workIds.map((wid, i) => [wid, i]));
  hydrated.sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));

  return NextResponse.json({
    results: hydrated,
    count: resultCount,
    query: savedSearch.query,
    from_year: savedSearch.from_year,
    to_year: savedSearch.to_year,
    sort: savedSearch.sort,
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: "Invalid search ID" }, { status: 400 });
  }

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete saved search:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
