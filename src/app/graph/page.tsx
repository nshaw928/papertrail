import { createClient } from "@/lib/supabase/server";
import TopicGraph from "@/components/topic-graph";

export default async function GraphPage() {
  const supabase = await createClient();

  const { data: topics } = await supabase
    .from("topics")
    .select("id, name, level, parent_topic_id, works_count")
    .order("level", { ascending: true });

  return <TopicGraph topics={topics ?? []} />;
}
