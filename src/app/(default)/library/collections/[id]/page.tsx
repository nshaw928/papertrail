import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/supabase/plans";
import { PLAN_LIMITS } from "@/lib/plans";
import PaperCard from "@/components/paper-card";
import CollectionHeader from "@/components/collection-header";
import CollectionNotesView from "@/components/collection-notes-view";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadWorksWithRelations } from "@/lib/supabase/queries";
import type { PaperNote } from "@/lib/types/app";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CollectionPage({ params }: PageProps) {
  const { id } = await params;
  const { supabase, user } = await requireUser();

  const { data: collection } = await supabase
    .from("collections")
    .select("id, name, created_at")
    .eq("id", id)
    .single();

  if (!collection) notFound();

  const userPlan = await getUserPlan(supabase, user.id);
  const canExport = PLAN_LIMITS[userPlan.plan].exportEnabled;

  const { data: collectionWorks } = await supabase
    .from("collection_works")
    .select("work_id, added_at")
    .eq("collection_id", id)
    .order("added_at", { ascending: false });

  let papers: Awaited<ReturnType<typeof loadWorksWithRelations>> = [];
  if (collectionWorks?.length) {
    const workIds = collectionWorks.map((cw) => cw.work_id);
    const { data: works } = await supabase
      .from("works")
      .select("*")
      .in("id", workIds);

    const hydrated = await loadWorksWithRelations(supabase, works ?? [], {
      userId: user.id,
    });

    const orderMap = new Map(collectionWorks.map((cw, i) => [cw.work_id, i]));
    hydrated.sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
    );
    papers = hydrated;
  }

  // Load notes for papers in this collection
  const workIds = papers.map((p) => p.id);
  let collectionNotes: (PaperNote & { paper_title: string })[] = [];
  if (workIds.length > 0) {
    const { data: noteRows } = await supabase
      .from("paper_notes")
      .select("id, work_id, content, anchor_page, anchor_y, anchor_quote, created_at, updated_at")
      .eq("user_id", user.id)
      .in("work_id", workIds)
      .order("created_at", { ascending: false });

    if (noteRows?.length) {
      const titleMap = new Map(papers.map((p) => [p.id, p.title]));
      collectionNotes = noteRows.map((n) => ({
        ...n,
        paper_title: titleMap.get(n.work_id) ?? "Untitled",
      }));
    }
  }

  const hasNotes = collectionNotes.length > 0;

  return (
    <div className="space-y-6">
      <CollectionHeader
        id={collection.id}
        name={collection.name}
        count={papers.length}
        canExport={canExport}
      />

      {papers.length > 0 ? (
        hasNotes ? (
          <Tabs defaultValue="papers">
            <TabsList>
              <TabsTrigger value="papers">Papers ({papers.length})</TabsTrigger>
              <TabsTrigger value="notes">Notes ({collectionNotes.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="papers">
              <div className="space-y-3">
                {papers.map((paper) => (
                  <PaperCard key={paper.id} paper={paper} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="notes">
              <CollectionNotesView notes={collectionNotes} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="space-y-3">
            {papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        )
      ) : (
        <p className="text-muted-foreground">
          No papers in this collection yet. Use the folder icon on any paper
          card to add papers.
        </p>
      )}
    </div>
  );
}
