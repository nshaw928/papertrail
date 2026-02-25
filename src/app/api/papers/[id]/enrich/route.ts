import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enrichCitations } from "@/lib/openalex/enrich-citations";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const admin = createAdminClient();

  try {
    const result = await enrichCitations(admin, id);
    if (result.references === 0 && result.citedBy === 0) {
      return NextResponse.json({ status: "skipped" });
    }
    return NextResponse.json({
      status: "done",
      references: result.references,
      citedBy: result.citedBy,
    });
  } catch (error) {
    console.error(`Enrichment failed for ${id}:`, error);
    return NextResponse.json(
      { error: "Enrichment failed" },
      { status: 500 }
    );
  }
}
