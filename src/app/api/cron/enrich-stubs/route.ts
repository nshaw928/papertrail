import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { batchGetWorks } from "@/lib/openalex/client";
import { ingestWorks } from "@/lib/openalex/ingest";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find stub works to hydrate
  const { data: stubs } = await admin
    .from("works")
    .select("id")
    .eq("is_stub", true)
    .limit(50);

  if (!stubs?.length) {
    return NextResponse.json({ status: "no stubs", hydrated: 0 });
  }

  const stubIds = stubs.map((s) => s.id);

  try {
    // Batch fetch from OpenAlex
    const openalexWorks = await batchGetWorks(stubIds);

    // Ingest full data
    await ingestWorks(admin, openalexWorks);

    return NextResponse.json({
      status: "done",
      requested: stubIds.length,
      hydrated: openalexWorks.length,
    });
  } catch (error) {
    console.error("Cron enrich-stubs error:", error);
    return NextResponse.json(
      { error: "Enrichment failed" },
      { status: 500 }
    );
  }
}
