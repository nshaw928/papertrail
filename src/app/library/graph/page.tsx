import { requireUser } from "@/lib/supabase/server";
import { loadLibraryGraphData } from "@/lib/supabase/queries";
import LibraryGraph from "@/components/library-graph";

export default async function LibraryGraphPage() {
  const { supabase, user } = await requireUser();
  const graphData = await loadLibraryGraphData(supabase, user.id);

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex h-[calc(100dvh-3rem)] items-center justify-center">
        <p className="text-muted-foreground">
          Save some papers to see your personal knowledge graph.
        </p>
      </div>
    );
  }

  return <LibraryGraph data={graphData} />;
}
