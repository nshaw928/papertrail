import Link from "next/link";
import { Network } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/supabase/plans";
import { PLAN_LIMITS } from "@/lib/plans";
import PaperCard from "@/components/paper-card";
import ExportButton from "@/components/export-button";
import { Button } from "@/components/ui/button";
import { loadWorksWithRelations } from "@/lib/supabase/queries";

export default async function LibraryPage() {
  const { supabase, user } = await requireUser();

  const { data: savedWorks } = await supabase
    .from("saved_works")
    .select("work_id, notes, saved_at")
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false });

  let papers: Awaited<ReturnType<typeof loadWorksWithRelations>> = [];
  if (savedWorks?.length) {
    const workIds = savedWorks.map((s) => s.work_id);
    const { data: works } = await supabase
      .from("works")
      .select("*")
      .in("id", workIds);

    const hydrated = await loadWorksWithRelations(supabase, works ?? [], {
      userId: user.id,
    });

    const orderMap = new Map(savedWorks.map((s, i) => [s.work_id, i]));
    hydrated.sort(
      (a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0)
    );
    papers = hydrated;
  }

  const userPlan = await getUserPlan(supabase, user.id);
  const canExport = PLAN_LIMITS[userPlan.plan].exportEnabled;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Library</h1>
          <p className="text-muted-foreground">
            {papers.length} saved paper{papers.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {papers.length > 0 && (
            <>
              <ExportButton scope="library" canExport={canExport} />
              <Button variant="outline" asChild>
                <Link href="/library/graph">
                  <Network className="mr-2 h-4 w-4" />
                  View as Graph
                </Link>
              </Button>
            </>
          )}
        </div>
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
