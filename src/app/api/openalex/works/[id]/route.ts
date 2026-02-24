import { NextRequest, NextResponse } from "next/server";
import { getOrFetchWork } from "@/lib/openalex/get-or-fetch";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const supabase = await createClient();
    const admin = createAdminClient();

    const work = await getOrFetchWork(id, supabase, admin);
    if (!work) {
      return NextResponse.json({ error: "Work not found" }, { status: 404 });
    }

    // Check saved status
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: saved } = await supabase
        .from("saved_works")
        .select("id")
        .eq("user_id", user.id)
        .eq("work_id", id)
        .maybeSingle();
      work.is_saved = !!saved;
    }

    return NextResponse.json(work);
  } catch (error) {
    console.error("Get work error:", error);
    return NextResponse.json(
      { error: "Failed to fetch work" },
      { status: 500 }
    );
  }
}
