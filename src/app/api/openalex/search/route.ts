import { NextRequest, NextResponse } from "next/server";
import { searchWorks } from "@/lib/openalex/client";
import { ingestWorks } from "@/lib/openalex/ingest";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiUser } from "@/lib/supabase/server";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import { checkLimit } from "@/lib/supabase/plans";

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

  try {
    const { results: openalexResults, meta } = await searchWorks(
      query,
      page,
      perPage,
      {
        fromYear: fromYear ? parseInt(fromYear, 10) : undefined,
        toYear: toYear ? parseInt(toYear, 10) : undefined,
        sort: sort ?? undefined,
      }
    );

    const admin = createAdminClient();
    const ingested = await ingestWorks(admin, openalexResults);

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
