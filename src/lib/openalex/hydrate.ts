import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { batchGetWorks } from "./client";
import { ingestWorks } from "./ingest";

type AdminClient = SupabaseClient<Database>;

const POSTGREST_IN_CHUNK = 200;
const OPENALEX_PAGE_SIZE = 100;
const DEFAULT_CONCURRENCY = 3;

/**
 * Hydrate stub works by fetching full data from OpenAlex.
 * 1. Queries DB for which of the given IDs are actually stubs.
 * 2. If zero stubs, returns 0 immediately (no API calls).
 * 3. Batch-fetches from OpenAlex and ingests full data.
 * Returns the count of works hydrated.
 */
export async function hydrateStubs(
  admin: AdminClient,
  workIds: string[]
): Promise<number> {
  const unique = [...new Set(workIds)];
  if (unique.length === 0) return 0;

  // Query DB for which IDs are actually stubs, chunked to stay within PostgREST limits
  const stubIds: string[] = [];
  for (let i = 0; i < unique.length; i += POSTGREST_IN_CHUNK) {
    const chunk = unique.slice(i, i + POSTGREST_IN_CHUNK);
    const { data } = await admin
      .from("works")
      .select("id")
      .in("id", chunk)
      .eq("is_stub", true);
    if (data) {
      stubIds.push(...data.map((w) => w.id));
    }
  }

  if (stubIds.length === 0) return 0;

  // Batch-fetch from OpenAlex and ingest
  const openalexWorks = await batchGetWorksAll(stubIds, DEFAULT_CONCURRENCY);
  if (openalexWorks.length > 0) {
    await ingestWorks(admin, openalexWorks);
  }

  return openalexWorks.length;
}

/**
 * Fetch all works by ID from OpenAlex, chunked into pages of 100
 * with bounded concurrency.
 */
async function batchGetWorksAll(
  ids: string[],
  concurrency: number
): Promise<Record<string, unknown>[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += OPENALEX_PAGE_SIZE) {
    chunks.push(ids.slice(i, i + OPENALEX_PAGE_SIZE));
  }

  const results: Record<string, unknown>[] = [];
  // Process chunks with bounded concurrency
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((chunk) => batchGetWorks(chunk))
    );
    for (const r of batchResults) {
      results.push(...r);
    }
  }

  return results;
}
