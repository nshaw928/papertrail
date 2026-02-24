import { createClient } from "@/lib/supabase/server";
import TopicGrid from "@/components/topic-grid";

export default async function TopicsPage() {
  const supabase = await createClient();

  // Get domain-level topics (level 0) with paper counts
  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, level, works_count")
    .eq("level", 0)
    .order("works_count", { ascending: false });

  // For each domain, count papers via work_topics
  const topicsWithCounts = await Promise.all(
    (topics ?? []).map(async (topic) => {
      const { count } = await supabase
        .from("work_topics")
        .select("*", { count: "exact", head: true })
        .eq("topic_id", topic.id);
      return { ...topic, paper_count: count ?? 0 };
    })
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Topics</h1>
        <p className="text-muted-foreground">
          Browse research by domain. Topics are organized in a four-level
          hierarchy: Domain, Field, Subfield, Topic.
        </p>
      </div>

      {topicsWithCounts.length > 0 ? (
        <TopicGrid topics={topicsWithCounts} />
      ) : (
        <p className="text-muted-foreground">
          No topics yet. Search for papers to start populating topics.
        </p>
      )}
    </div>
  );
}
