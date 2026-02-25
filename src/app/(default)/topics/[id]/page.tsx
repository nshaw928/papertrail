import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import PaperCard from "@/components/paper-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { levelName } from "@/lib/utils";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import type { WorkWithRelations } from "@/lib/types/app";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TopicPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: topic } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .single();

  if (!topic) notFound();

  const { data: children } = await supabase
    .from("topics")
    .select("id, name, level, works_count")
    .eq("parent_topic_id", id)
    .order("works_count", { ascending: false });

  const { data: workLinks } = await supabase
    .from("work_topics")
    .select("work_id, score, is_primary")
    .eq("topic_id", id)
    .order("score", { ascending: false })
    .limit(50);

  let papers: WorkWithRelations[] = [];
  if (workLinks?.length) {
    const workIds = workLinks.map((l) => l.work_id);
    const { data: works } = await supabase
      .from("works")
      .select("*")
      .in("id", workIds)
      .eq("is_stub", false)
      .order("cited_by_count", { ascending: false });

    papers = await loadWorksWithRelations(supabase, works ?? []);
  }

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
        <div>
          <h2 className="mb-4 text-lg font-semibold">Sub-categories</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(children ?? []).map((child) => (
              <Link key={child.id} href={`/topics/${child.id}`}>
                <Card className="transition-colors hover:bg-accent/50 h-full">
                  <CardContent className="p-4">
                    <h3 className="font-medium leading-snug">{child.name}</h3>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {levelName(child.level)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(child.works_count ?? 0).toLocaleString()} papers
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
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
