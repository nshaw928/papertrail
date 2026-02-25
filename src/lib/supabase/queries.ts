import type { SupabaseClient } from "@supabase/supabase-js";
import type { WorkWithRelations, LibraryGraphData } from "@/lib/types/app";

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

/**
 * Build graph data for a user's saved papers:
 * paper nodes, topic nodes (with parent chain), citation edges, topic edges.
 */
export async function loadLibraryGraphData(
  supabase: SupabaseClient,
  userId: string
): Promise<LibraryGraphData> {
  // 1. Get saved work IDs
  const { data: savedRows } = await supabase
    .from("saved_works")
    .select("work_id")
    .eq("user_id", userId);

  const savedWorkIds = savedRows?.map((r) => r.work_id) ?? [];
  if (savedWorkIds.length === 0) {
    return { nodes: [], edges: [] };
  }

  // 2. Get work details for paper nodes
  const { data: works } = await supabase
    .from("works")
    .select("id, title, year, cited_by_count")
    .in("id", savedWorkIds);

  const nodes: LibraryGraphData["nodes"] = (works ?? []).map((w) => ({
    id: w.id,
    label: w.title ?? "Untitled",
    type: "paper" as const,
    year: w.year,
    cited_by_count: w.cited_by_count ?? 0,
  }));

  const edges: LibraryGraphData["edges"] = [];

  // 3. Get topic links for saved works
  const { data: topicLinks } = await supabase
    .from("work_topics")
    .select("work_id, topic_id")
    .in("work_id", savedWorkIds);

  const topicIds = new Set<string>();
  for (const link of topicLinks ?? []) {
    topicIds.add(link.topic_id);
    edges.push({
      source: link.work_id,
      target: link.topic_id,
      type: "has_topic",
    });
  }

  // 4. Get topics and walk parent chain (max 4 levels)
  const allTopicIds = new Set(topicIds);
  let currentIds = [...topicIds];

  for (let i = 0; i < 4 && currentIds.length > 0; i++) {
    const { data: topicRows } = await supabase
      .from("topics")
      .select("id, name, level, parent_topic_id")
      .in("id", currentIds);

    const nextIds: string[] = [];
    for (const t of topicRows ?? []) {
      if (!nodes.some((n) => n.id === t.id)) {
        nodes.push({
          id: t.id,
          label: t.name,
          type: "topic",
          level: t.level,
        });
      }
      if (t.parent_topic_id && !allTopicIds.has(t.parent_topic_id)) {
        allTopicIds.add(t.parent_topic_id);
        nextIds.push(t.parent_topic_id);
        edges.push({
          source: t.parent_topic_id,
          target: t.id,
          type: "topic_parent",
        });
      } else if (t.parent_topic_id && allTopicIds.has(t.parent_topic_id)) {
        // Parent already loaded — just add the edge if not duplicate
        if (
          !edges.some(
            (e) =>
              e.source === t.parent_topic_id &&
              e.target === t.id &&
              e.type === "topic_parent"
          )
        ) {
          edges.push({
            source: t.parent_topic_id,
            target: t.id,
            type: "topic_parent",
          });
        }
      }
    }
    currentIds = nextIds;
  }

  // Fetch any remaining parent topics that were added in the last iteration
  if (currentIds.length > 0) {
    const { data: topicRows } = await supabase
      .from("topics")
      .select("id, name, level")
      .in("id", currentIds);

    for (const t of topicRows ?? []) {
      if (!nodes.some((n) => n.id === t.id)) {
        nodes.push({
          id: t.id,
          label: t.name,
          type: "topic",
          level: t.level,
        });
      }
    }
  }

  // 5. Citation edges (both ends in saved set)
  const { data: citations } = await supabase
    .from("work_citations")
    .select("citing_work_id, cited_work_id")
    .in("citing_work_id", savedWorkIds)
    .in("cited_work_id", savedWorkIds);

  for (const c of citations ?? []) {
    edges.push({
      source: c.citing_work_id,
      target: c.cited_work_id,
      type: "cites",
    });
  }

  return { nodes, edges };
}
