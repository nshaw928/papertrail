import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, PRICE_IDS } from "@/lib/stripe/client";
import { requireApiUser } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireLabRole } from "@/lib/supabase/labs";

export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { supabase, user } = auth;

  const body = await request.json().catch(() => ({}));
  const { plan, billing, labId } = body as {
    plan: "researcher" | "lab";
    billing: "monthly" | "yearly";
    labId?: string;
  };

  const stripe = getStripe();

  const validPlans = ["researcher", "lab"];
  const validBilling = ["monthly", "yearly"];

  if (!plan || !billing) {
    return NextResponse.json({ error: "Missing plan or billing" }, { status: 400 });
  }

  if (!validPlans.includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }
  if (!validBilling.includes(billing)) {
    return NextResponse.json({ error: "Invalid billing interval" }, { status: 400 });
  }

  // Validate labId: user must be owner/admin of the lab
  if (labId) {
    const role = await requireLabRole(supabase, labId, user.id, ["owner", "admin"]);
    if (!role) {
      return NextResponse.json({ error: "Not authorized for this lab" }, { status: 403 });
    }
  }

  const priceId = PRICE_IDS[`${plan}_${billing}`];
  if (!priceId) {
    return NextResponse.json({ error: "Invalid plan/billing combo" }, { status: 400 });
  }

  // Check for existing Stripe customer
  const admin = createAdminClient();
  const { data: existingSub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  let customerId = existingSub?.stripe_customer_id;

  try {
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] =
      plan === "lab"
        ? [{ price: priceId, quantity: 1, adjustable_quantity: { enabled: true, minimum: 1, maximum: 50 } }]
        : [{ price: priceId, quantity: 1 }];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: lineItems,
      success_url: `${origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        supabase_user_id: user.id,
        plan,
        ...(labId ? { lab_id: labId } : {}),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json({ error: "Payment service unavailable" }, { status: 502 });
  }
}
