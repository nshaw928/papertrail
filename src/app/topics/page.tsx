import { createClient } from "@/lib/supabase/server";
import TopicsViewToggle from "@/components/topics-view-toggle";

export default async function TopicsPage() {
  const supabase = await createClient();

  // Get domain-level topics (level 0) with paper counts for grid view
  const { data: domainTopics } = await supabase
    .from("topics")
    .select("id, name, level, works_count")
    .eq("level", 0)
    .order("works_count", { ascending: false });

  const gridTopics = await Promise.all(
    (domainTopics ?? []).map(async (topic) => {
      const { count } = await supabase
        .from("work_topics")
        .select("*", { count: "exact", head: true })
        .eq("topic_id", topic.id);
      return { ...topic, paper_count: count ?? 0 };
    })
  );

  // Get all topics for graph view (lightweight, no joins)
  const { data: allTopics } = await supabase
    .from("topics")
    .select("id, name, level, parent_topic_id, works_count")
    .order("level", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
        <p className="text-muted-foreground">
          Browse research by domain. Topics are organized in a four-level
          hierarchy: Domain, Field, Subfield, Topic.
        </p>
      </div>

      {gridTopics.length > 0 ? (
        <TopicsViewToggle
          gridTopics={gridTopics}
          allTopics={allTopics ?? []}
        />
      ) : (
        <p className="text-muted-foreground">
          No topics yet. Search for papers to start populating topics.
        </p>
      )}
    </div>
  );
}
