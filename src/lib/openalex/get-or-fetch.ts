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
    id: work.id,
    title: work.title,
    abstract: work.abstract,
    year: work.year,
    doi: work.doi,
    cited_by_count: work.cited_by_count,
    publication_date: work.publication_date,
    type: work.type,
    language: work.language,
    is_retracted: work.is_retracted,
    is_open_access: work.is_open_access,
    open_access_url: work.open_access_url,
    fwci: work.fwci,
    counts_by_year: work.counts_by_year as WorkWithRelations["counts_by_year"],
    biblio: work.biblio as WorkWithRelations["biblio"],
    keywords: work.keywords as WorkWithRelations["keywords"],
    sustainable_development_goals: work.sustainable_development_goals as WorkWithRelations["sustainable_development_goals"],
    mesh: work.mesh as WorkWithRelations["mesh"],
    indexed_in: work.indexed_in,
    is_stub: work.is_stub,
    source_id: work.source_id,
    source_display_name: work.source_display_name,
    summary: work.summary,
    ai_tags: work.ai_tags as WorkWithRelations["ai_tags"],
    citations_fetched: work.citations_fetched,
    authors,
    topics,
  };
}
