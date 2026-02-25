import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import { fetchCitations, fetchCitedBy } from "@/lib/semantic-scholar/client";

type AdminClient = SupabaseClient<Database>;

/**
 * Enrich a work with citation data from Semantic Scholar.
 * Checks the citations_fetched flag first; returns early if already done.
 * Creates stub works and citation edges for all references and cited-by papers.
 */
export async function enrichCitations(
  admin: AdminClient,
  workId: string
): Promise<{ references: number; citedBy: number }> {
  // Check if already enriched
  const { data: work } = await admin
    .from("works")
    .select("citations_fetched")
    .eq("id", workId)
    .single();

  if (!work || work.citations_fetched) {
    return { references: 0, citedBy: 0 };
  }

  const [citedIds, citingIds] = await Promise.all([
    fetchCitations(workId),
    fetchCitedBy(workId),
  ]);

  if (citedIds.length > 0) {
    const stubs = citedIds.map((cid) => ({ id: cid, title: "Unknown", is_stub: true }));
    await admin.from("works").upsert(stubs, { onConflict: "id", ignoreDuplicates: true });
    const edges = citedIds.map((cid) => ({ citing_work_id: workId, cited_work_id: cid }));
    await admin.from("work_citations").upsert(edges, {
      onConflict: "citing_work_id,cited_work_id",
      ignoreDuplicates: true,
    });
  }

  if (citingIds.length > 0) {
    const stubs = citingIds.map((cid) => ({ id: cid, title: "Unknown", is_stub: true }));
    await admin.from("works").upsert(stubs, { onConflict: "id", ignoreDuplicates: true });
    const edges = citingIds.map((cid) => ({ citing_work_id: cid, cited_work_id: workId }));
    await admin.from("work_citations").upsert(edges, {
      onConflict: "citing_work_id,cited_work_id",
      ignoreDuplicates: true,
    });
  }

  await admin.from("works").update({ citations_fetched: true }).eq("id", workId);

  return { references: citedIds.length, citedBy: citingIds.length };
}
