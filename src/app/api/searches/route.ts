import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findOrCreateCache } from "@/lib/search-cache";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, query, from_year, to_year, sort, result_count, cache_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error("Failed to list saved searches:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { query, work_ids, result_count, from_year, to_year, sort } = body as Record<string, unknown>;

  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }
  if (query.length > 500) {
    return NextResponse.json({ error: "query too long (max 500 chars)" }, { status: 400 });
  }
  if (!Array.isArray(work_ids) || work_ids.length === 0) {
    return NextResponse.json({ error: "work_ids must be a non-empty array" }, { status: 400 });
  }
  if (typeof result_count !== "number" || result_count < 0) {
    return NextResponse.json({ error: "result_count must be a non-negative number" }, { status: 400 });
  }

  // Find or create the global search cache entry
  const admin = createAdminClient();
  const cacheRow = await findOrCreateCache(admin, {
    query: query as string,
    fromYear: (from_year as number | null) ?? null,
    toYear: (to_year as number | null) ?? null,
    sort: (sort as string | null) ?? null,
    workIds: work_ids as string[],
    resultCount: result_count as number,
  });

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      user_id: user.id,
      query: (query as string).trim(),
      work_ids: work_ids as string[],
      result_count: result_count as number,
      from_year: (from_year as number | null) ?? undefined,
      to_year: (to_year as number | null) ?? undefined,
      sort: (sort as string | null) ?? undefined,
      cache_id: cacheRow?.id ?? undefined,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save search:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
