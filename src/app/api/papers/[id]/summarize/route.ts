import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";
import { checkLimit } from "@/lib/supabase/plans";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  // Check AI summary plan limit
  const limit = await checkLimit(supabase, user.id, "ai_summary");
  if (!limit.allowed) {
    return NextResponse.json(
      { error: limit.reason, code: "LIMIT_REACHED" },
      { status: 429 }
    );
  }

  // Validate work_id format (OpenAlex IDs are like W1234567890)
  if (!/^W\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid paper ID" }, { status: 400 });
  }

  // Check if summary already exists
  const { data: work } = await supabase
    .from("works")
    .select("summary, ai_tags, open_access_url")
    .eq("id", id)
    .single();

  if (!work) {
    return NextResponse.json({ error: "Paper not found" }, { status: 404 });
  }

  if (work.summary) {
    return NextResponse.json({
      status: "completed",
      summary: work.summary,
      ai_tags: work.ai_tags,
    });
  }

  // Check for existing pending/processing job
  const { data: existingJob } = await supabase
    .from("ai_jobs")
    .select("id, status")
    .eq("work_id", id)
    .in("status", ["pending", "processing"])
    .limit(1)
    .maybeSingle();

  if (existingJob) {
    return NextResponse.json({ status: "queued", job_id: existingJob.id });
  }

  // Insert new job
  const { data: job, error } = await supabase.from("ai_jobs").insert({
    work_id: id,
    user_id: user.id,
    priority: 10,
    source_url: work.open_access_url ?? null,
  }).select("id").single();

  if (error) {
    console.error("Failed to create AI job:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  // Increment usage
  await supabase.rpc("increment_usage", {
    target_user_id: user.id,
    field: "ai_summary_requests",
  });

  return NextResponse.json({ status: "queued", job_id: job.id });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  if (!/^W\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid paper ID" }, { status: 400 });
  }

  // Get latest job for this work
  const { data: job } = await supabase
    .from("ai_jobs")
    .select("id, status, error, created_at")
    .eq("work_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get summary from works table if completed
  const { data: work } = await supabase
    .from("works")
    .select("summary, ai_tags")
    .eq("id", id)
    .single();

  return NextResponse.json({
    status: work?.summary ? "completed" : (job?.status ?? "none"),
    summary: work?.summary ?? null,
    ai_tags: work?.ai_tags ?? null,
    error: job?.error ?? null,
  });
}
