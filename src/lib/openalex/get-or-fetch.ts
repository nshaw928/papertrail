import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type { WorkWithRelations } from "@/lib/types/app";
import { getWork } from "./client";
import { ingestWork } from "./ingest";

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
  // Try to load from cache
  const cached = await loadWorkFromDb(supabase, id);
  if (cached && !cached.is_stub) return cached;

  // Fetch from OpenAlex
  const openalexWork = await getWork(id);
  if (!openalexWork) return null;

  // Ingest into Supabase
  await ingestWork(admin, openalexWork);

  // Reload from DB with relations
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

  // Load authors via junction
  const { data: authorLinks } = await supabase
    .from("work_authors")
    .select("author_id, position, is_corresponding")
    .eq("work_id", id)
    .order("position");

  const authors: WorkWithRelations["authors"] = [];
  if (authorLinks?.length) {
    const authorIds = authorLinks.map((l) => l.author_id);
    const { data: authorRows } = await supabase
      .from("authors")
      .select("id, display_name, orcid")
      .in("id", authorIds);

    const authorMap = new Map(authorRows?.map((a) => [a.id, a]) ?? []);
    for (const link of authorLinks) {
      const a = authorMap.get(link.author_id);
      if (a) {
        authors.push({
          id: a.id,
          display_name: a.display_name,
          orcid: a.orcid,
          position: link.position,
          is_corresponding: link.is_corresponding,
        });
      }
    }
  }

  // Load topics via junction
  const { data: topicLinks } = await supabase
    .from("work_topics")
    .select("topic_id, score, is_primary")
    .eq("work_id", id)
    .order("score", { ascending: false });

  const topics: WorkWithRelations["topics"] = [];
  if (topicLinks?.length) {
    const topicIds = topicLinks.map((l) => l.topic_id);
    const { data: topicRows } = await supabase
      .from("topics")
      .select("id, name, level")
      .in("id", topicIds);

    const topicMap = new Map(topicRows?.map((t) => [t.id, t]) ?? []);
    for (const link of topicLinks) {
      const t = topicMap.get(link.topic_id);
      if (t) {
        topics.push({
          id: t.id,
          name: t.name,
          level: t.level,
          score: link.score,
          is_primary: link.is_primary,
        });
      }
    }
  }

  return {
    ...work,
    authors,
    topics,
  } as WorkWithRelations;
}
