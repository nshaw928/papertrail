import { requireUser } from "@/lib/supabase/server";
import PaperCard from "@/components/paper-card";
import type { WorkWithRelations } from "@/lib/types/app";

export default async function LibraryPage() {
  const { supabase, user } = await requireUser();

  // Get saved works
  const { data: savedWorks } = await supabase
    .from("saved_works")
    .select("work_id, notes, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  const papers: WorkWithRelations[] = [];
  if (savedWorks?.length) {
    const workIds = savedWorks.map((s) => s.work_id);
    const { data: works } = await supabase
      .from("works")
      .select("*")
      .in("id", workIds);

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

      papers.push({ ...work, authors, topics, is_saved: true } as WorkWithRelations);
    }

    // Sort by saved order
    const orderMap = new Map(savedWorks.map((s, i) => [s.work_id, i]));
    papers.sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Library</h1>
        <p className="text-muted-foreground">
          {papers.length} saved paper{papers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {papers.length > 0 ? (
        <div className="space-y-3">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No papers saved yet. Search for papers and click the save button to
          add them here.
        </p>
      )}
    </div>
  );
}
