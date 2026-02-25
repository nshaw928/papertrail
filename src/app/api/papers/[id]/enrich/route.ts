import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchCitations, fetchCitedBy } from "@/lib/semantic-scholar/client";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient();

  // Check if already enriched
  const { data: work } = await admin
    .from("works")
    .select("citations_fetched")
    .eq("id", id)
    .single();

  if (!work || work.citations_fetched) {
    return NextResponse.json({ status: "skipped" });
  }

  try {
    // Fetch citations from Semantic Scholar
    const citedIds = await fetchCitations(id);

    if (citedIds.length > 0) {
      // Create stubs for missing works
      const stubs = citedIds.map((citedId) => ({
        id: citedId,
        title: "Unknown",
        is_stub: true,
      }));
      await admin
        .from("works")
        .upsert(stubs, { onConflict: "id", ignoreDuplicates: true });

      // Create citation edges
      const edges = citedIds.map((citedId) => ({
        citing_work_id: id,
        cited_work_id: citedId,
      }));
      await admin.from("work_citations").upsert(edges, {
        onConflict: "citing_work_id,cited_work_id",
        ignoreDuplicates: true,
      });
    }

    // Fetch papers that cite this work
    const citingIds = await fetchCitedBy(id);

    if (citingIds.length > 0) {
      // Create stubs for citing papers
      const citingStubs = citingIds.map((citingId) => ({
        id: citingId,
        title: "Unknown",
        is_stub: true,
      }));
      await admin
        .from("works")
        .upsert(citingStubs, { onConflict: "id", ignoreDuplicates: true });

      // Create reverse citation edges
      const reverseEdges = citingIds.map((citingId) => ({
        citing_work_id: citingId,
        cited_work_id: id,
      }));
      await admin.from("work_citations").upsert(reverseEdges, {
        onConflict: "citing_work_id,cited_work_id",
        ignoreDuplicates: true,
      });
    }

    // Mark as enriched
    await admin
      .from("works")
      .update({ citations_fetched: true })
      .eq("id", id);

    return NextResponse.json({
      status: "done",
      references: citedIds.length,
      citedBy: citingIds.length,
    });
  } catch (error) {
    console.error(`Enrichment failed for ${id}:`, error);
    return NextResponse.json(
      { error: "Enrichment failed" },
      { status: 500 }
    );
  }
}
