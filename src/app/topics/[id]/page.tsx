import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TopicGrid from "@/components/topic-grid";
import PaperCard from "@/components/paper-card";
import { Badge } from "@/components/ui/badge";
import { levelName } from "@/lib/utils";
import type { WorkWithRelations } from "@/lib/types/app";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TopicPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // Get topic
  const { data: topic } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .single();

  if (!topic) notFound();

  // Get children
  const { data: children } = await supabase
    .from("topics")
    .select("id, name, level, works_count")
    .eq("parent_topic_id", id)
    .order("works_count", { ascending: false });

  // Get papers for this topic
  const { data: workLinks } = await supabase
    .from("work_topics")
    .select("work_id, score, is_primary")
    .eq("topic_id", id)
    .order("score", { ascending: false })
    .limit(50);

  const papers: WorkWithRelations[] = [];
  if (workLinks?.length) {
    const workIds = workLinks.map((l) => l.work_id);
    const { data: works } = await supabase
      .from("works")
      .select("*")
      .in("id", workIds)
      .eq("is_stub", false)
      .order("cited_by_count", { ascending: false });

    for (const work of works ?? []) {
      // Load authors
      const { data: authorLinks } = await supabase
        .from("work_authors")
        .select("author_id, position, is_corresponding")
        .eq("work_id", work.id)
        .order("position");

      const authors: WorkWithRelations["authors"] = [];
      if (authorLinks?.length) {
        const { data: authorRows } = await supabase
          .from("authors")
          .select("id, display_name, orcid")
          .in("id", authorLinks.map((l) => l.author_id));
        const authorMap = new Map(authorRows?.map((a) => [a.id, a]) ?? []);
        for (const link of authorLinks) {
          const a = authorMap.get(link.author_id);
          if (a)
            authors.push({
              id: a.id,
              display_name: a.display_name,
              orcid: a.orcid,
              position: link.position,
              is_corresponding: link.is_corresponding,
            });
        }
      }

      // Load topics
      const { data: topicLinks } = await supabase
        .from("work_topics")
        .select("topic_id, score, is_primary")
        .eq("work_id", work.id)
        .order("score", { ascending: false })
        .limit(5);

      const topics: WorkWithRelations["topics"] = [];
      if (topicLinks?.length) {
        const { data: topicRows } = await supabase
          .from("topics")
          .select("id, name, level")
          .in("id", topicLinks.map((l) => l.topic_id));
        const topicMap = new Map(topicRows?.map((t) => [t.id, t]) ?? []);
        for (const link of topicLinks) {
          const t = topicMap.get(link.topic_id);
          if (t)
            topics.push({
              id: t.id,
              name: t.name,
              level: t.level,
              score: link.score,
              is_primary: link.is_primary,
            });
        }
      }

      papers.push({ ...work, authors, topics } as WorkWithRelations);
    }
  }

  // Count papers
  const { count: paperCount } = await supabase
    .from("work_topics")
    .select("*", { count: "exact", head: true })
    .eq("topic_id", id);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{levelName(topic.level)}</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{topic.name}</h1>
        {topic.description && (
          <p className="text-muted-foreground">{topic.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {(paperCount ?? 0).toLocaleString()} papers
        </p>
      </div>

      {(children?.length ?? 0) > 0 && (
        <TopicGrid
          topics={children ?? []}
          title="Sub-categories"
        />
      )}

      {papers.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Papers</h2>
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </div>
      )}
    </div>
  );
}
