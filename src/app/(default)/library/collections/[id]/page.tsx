import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import PaperCard from "@/components/paper-card";
import CollectionHeader from "@/components/collection-header";
import { loadWorksWithRelations } from "@/lib/supabase/queries";

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

  return (
    <div className="space-y-6">
      <CollectionHeader
        id={collection.id}
        name={collection.name}
        count={papers.length}
      />

      {papers.length > 0 ? (
        <div className="space-y-3">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No papers in this collection yet. Use the folder icon on any paper
          card to add papers.
        </p>
      )}
    </div>
  );
}
