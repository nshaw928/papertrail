import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = (body as { email?: string }).email?.trim().toLowerCase();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("waitlist").insert({
    email,
    source: "landing_page",
  });

  if (error) {
    // Unique violation — already on waitlist
    if (error.code === "23505") {
      return NextResponse.json({ message: "You're already on the list!" });
    }
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ message: "You're on the list!" }, { status: 201 });
}
