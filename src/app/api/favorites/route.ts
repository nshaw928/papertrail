import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/supabase/server";

// GET: list user's favorite collections
export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase } = auth;

  const { data, error } = await supabase.rpc("get_sidebar_favorites");

  if (error) {
    console.error("Failed to fetch favorites:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

// POST: add a favorite
export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => ({}));
  const { collection_type, collection_id } = body as {
    collection_type?: string;
    collection_id?: string;
  };

  if (!collection_type || !collection_id) {
    return NextResponse.json(
      { error: "collection_type and collection_id are required" },
      { status: 400 }
    );
  }

  if (collection_type !== "personal" && collection_type !== "lab") {
    return NextResponse.json({ error: "Invalid collection_type" }, { status: 400 });
  }

  const { error } = await supabase.from("collection_favorites").upsert(
    {
      user_id: user.id,
      collection_type,
      collection_id,
    },
    { onConflict: "user_id,collection_type,collection_id" }
  );

  if (error) {
    console.error("Failed to add favorite:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "added" });
}

// DELETE: remove a favorite
export async function DELETE(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => ({}));
  const { collection_type, collection_id } = body as {
    collection_type?: string;
    collection_id?: string;
  };

  if (!collection_type || !collection_id) {
    return NextResponse.json(
      { error: "collection_type and collection_id are required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("collection_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("collection_type", collection_type)
    .eq("collection_id", collection_id);

  if (error) {
    console.error("Failed to remove favorite:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "removed" });
}
