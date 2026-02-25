import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { WorkWithRelations } from "@/lib/types/app";
import { getWork } from "./client";
import { ingestWork } from "./ingest";
import { loadWorksWithRelations } from "@/lib/supabase/queries";

type ReadClient = SupabaseClient<Database>;
type AdminClient = SupabaseClient<Database>;

/**
 * Cache-first work retrieval.
 * 1. Check Supabase for existing non-stub work
 * 2. If not found or is_stub, fetch from OpenAlex and ingest
 * 3. Return the work with authors and topics
 */
export async function getOrFetchWork(
  id: string,
  supabase: ReadClient,
  admin: AdminClient
): Promise<WorkWithRelations | null> {
  const cached = await loadWorkFromDb(supabase, id);
  if (cached && !cached.is_stub) return cached;

  const openalexWork = await getWork(id);
  if (!openalexWork) return null;

  await ingestWork(admin, openalexWork);

  return loadWorkFromDb(supabase, id);
}

async function loadWorkFromDb(
  supabase: ReadClient,
  id: string
): Promise<WorkWithRelations | null> {
  const { data: work } = await supabase
    .from("works")
    .select("*")
    .eq("id", id)
    .single();

  if (!work) return null;

  const [result] = await loadWorksWithRelations(supabase, [work]);
  return result ?? null;
}
