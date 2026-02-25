import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkWithRelations } from "@/lib/types/app";

/**
 * Batch-load authors and topics for a list of work rows,
 * returning fully hydrated WorkWithRelations[].
 *
 * Uses 2 queries (work_authors + work_topics) instead of 2N.
 */
export async function loadWorksWithRelations(
  supabase: SupabaseClient,
  works: Record<string, unknown>[],
  opts?: { userId?: string }
): Promise<WorkWithRelations[]> {
  if (works.length === 0) return [];

  const workIds = works.map((w) => w.id as string);

  // Batch load all author links
  const { data: allAuthorLinks } = await supabase
    .from("work_authors")
    .select("work_id, author_id, position, is_corresponding")
    .in("work_id", workIds)
    .order("position");

  // Get unique author IDs and fetch author details
  const authorIds = [...new Set(allAuthorLinks?.map((l) => l.author_id) ?? [])];
  const authorMap = new Map<string, { id: string; display_name: string; orcid: string | null }>();
  if (authorIds.length > 0) {
    const { data: authorRows } = await supabase
      .from("authors")
      .select("id, display_name, orcid")
      .in("id", authorIds);
    for (const a of authorRows ?? []) {
      authorMap.set(a.id, a);
    }
  }

  // Batch load all topic links
  const { data: allTopicLinks } = await supabase
    .from("work_topics")
    .select("work_id, topic_id, score, is_primary")
    .in("work_id", workIds)
    .order("score", { ascending: false });

  // Get unique topic IDs and fetch topic details
  const topicIds = [...new Set(allTopicLinks?.map((l) => l.topic_id) ?? [])];
  const topicMap = new Map<string, { id: string; name: string; level: number }>();
  if (topicIds.length > 0) {
    const { data: topicRows } = await supabase
      .from("topics")
      .select("id, name, level")
      .in("id", topicIds);
    for (const t of topicRows ?? []) {
      topicMap.set(t.id, t);
    }
  }

  // Check saved status if userId provided
  let savedIds = new Set<string>();
  if (opts?.userId) {
    const { data: savedWorks } = await supabase
      .from("saved_works")
      .select("work_id")
      .eq("user_id", opts.userId)
      .in("work_id", workIds);
    savedIds = new Set(savedWorks?.map((s) => s.work_id) ?? []);
  }

  // Group author/topic links by work_id
  const authorLinksByWork = new Map<string, typeof allAuthorLinks>();
  for (const link of allAuthorLinks ?? []) {
    const existing = authorLinksByWork.get(link.work_id) ?? [];
    existing.push(link);
    authorLinksByWork.set(link.work_id, existing);
  }

  const topicLinksByWork = new Map<string, typeof allTopicLinks>();
  for (const link of allTopicLinks ?? []) {
    const existing = topicLinksByWork.get(link.work_id) ?? [];
    existing.push(link);
    topicLinksByWork.set(link.work_id, existing);
  }

  // Assemble results
  return works.map((work) => {
    const wid = work.id as string;

    const authors: WorkWithRelations["authors"] = [];
    for (const link of authorLinksByWork.get(wid) ?? []) {
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

    const topics: WorkWithRelations["topics"] = [];
    for (const link of topicLinksByWork.get(wid) ?? []) {
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

    return {
      ...work,
      authors,
      topics,
      ...(opts?.userId !== undefined ? { is_saved: savedIds.has(wid) } : {}),
    } as WorkWithRelations;
  });
}
