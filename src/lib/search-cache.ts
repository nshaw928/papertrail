import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

type AdminClient = SupabaseClient<Database>;

export function computeQueryHash(
  query: string,
  fromYear: number | null | undefined,
  toYear: number | null | undefined,
  sort: string | null | undefined
): string {
  return `${query.toLowerCase().trim()}|${fromYear ?? ""}|${toYear ?? ""}|${sort ?? ""}`;
}

export async function findOrCreateCache(
  admin: AdminClient,
  params: {
    query: string;
    fromYear: number | null | undefined;
    toYear: number | null | undefined;
    sort: string | null | undefined;
    workIds: string[];
    resultCount: number;
  }
) {
  const hash = computeQueryHash(params.query, params.fromYear, params.toYear, params.sort);

  const { data: existing } = await admin
    .from("search_cache")
    .select("*")
    .eq("query_hash", hash)
    .single();

  if (existing) return existing;

  const { data: created } = await admin
    .from("search_cache")
    .insert({
      query_hash: hash,
      query: params.query.trim(),
      from_year: params.fromYear ?? null,
      to_year: params.toYear ?? null,
      sort: params.sort ?? null,
      work_ids: params.workIds,
      result_count: params.resultCount,
      refreshed_at: new Date().toISOString(),
    })
    .select()
    .single();

  return created;
}

export function isCacheStale(refreshedAt: string, maxAgeHours = 4): boolean {
  const age = Date.now() - new Date(refreshedAt).getTime();
  return age > maxAgeHours * 60 * 60 * 1000;
}
