import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin } from "@/lib/admin";
import type { Database } from "@/lib/types/database";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = await request.json().catch(() => ({}));
  const { content, category, email } = body as {
    content?: string;
    category?: string;
    email?: string;
  };

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 });
  }

  if (content.length > 5000) {
    return NextResponse.json({ error: "Feedback too long (max 5000 chars)" }, { status: 400 });
  }

  // Use admin client to bypass RLS for insert (anonymous users can submit)
  const admin = createAdminClient();
  const { error } = await admin.from("feedback").insert({
    user_id: user?.id ?? null,
    email: user?.email ?? email ?? null,
    category: (category || "general") as Database["public"]["Enums"]["feedback_category"],
    content: content.trim(),
  });

  if (error) {
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (!isAdmin(user.id)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
