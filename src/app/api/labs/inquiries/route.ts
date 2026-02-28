import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_LAB_SIZES = new Set(["2-10", "10-25", "25-50", "50+"]);
const MAX_LENGTHS = { name: 200, email: 320, institution: 300, message: 5000 } as const;

// POST: submit a lab inquiry (public, no auth required)
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { name, email, institution, lab_size, message } = body as {
    name?: string;
    email?: string;
    institution?: string;
    lab_size?: string;
    message?: string;
  };

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }
  if (name.trim().length > MAX_LENGTHS.name) {
    return NextResponse.json({ error: `Name too long (max ${MAX_LENGTHS.name} chars)` }, { status: 400 });
  }
  if (institution && institution.trim().length > MAX_LENGTHS.institution) {
    return NextResponse.json({ error: `Institution too long (max ${MAX_LENGTHS.institution} chars)` }, { status: 400 });
  }
  if (message && message.trim().length > MAX_LENGTHS.message) {
    return NextResponse.json({ error: `Message too long (max ${MAX_LENGTHS.message} chars)` }, { status: 400 });
  }
  if (lab_size && !VALID_LAB_SIZES.has(lab_size)) {
    return NextResponse.json({ error: "Invalid lab size" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error } = await admin.from("lab_inquiries").insert({
    name: name.trim(),
    email: email.trim().toLowerCase(),
    institution: institution?.trim() || null,
    lab_size: lab_size || null,
    message: message?.trim() || null,
  });

  if (error) {
    console.error("Failed to save lab inquiry:", error.message);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ status: "submitted" }, { status: 201 });
}
