import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PlanType } from "@/lib/types/app";

const VALID_PLANS: PlanType[] = ["researcher", "lab"];
const VALID_STATUSES = ["active", "canceled", "past_due", "trialing", "incomplete"] as const;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const rawPlan = session.metadata?.plan ?? "researcher";
        const labId = session.metadata?.lab_id || null;

        // Validate plan from metadata to prevent injection
        if (!VALID_PLANS.includes(rawPlan as PlanType)) {
          console.error("Invalid plan in checkout metadata:", rawPlan);
          return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
        }
        const plan = rawPlan as PlanType;

        if (!userId || !session.subscription) break;

        const sub = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        // In Stripe SDK v20, current_period_start/end moved to SubscriptionItem
        const item = sub.items.data[0];

        const { error: upsertError } = await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            lab_id: labId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: sub.id,
            plan,
            status: "active",
            current_period_start: new Date(item.current_period_start * 1000).toISOString(),
            current_period_end: new Date(item.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
          },
          { onConflict: "user_id" }
        );
        if (upsertError) {
          console.error("Supabase upsert failed:", upsertError);
          return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const item = sub.items.data[0];

        const { data: existing } = await admin
          .from("subscriptions")
          .select("id")
          .eq("stripe_subscription_id", sub.id)
          .single();

        if (existing) {
          const status = (VALID_STATUSES as readonly string[]).includes(sub.status)
            ? sub.status
            : "active";

          const { error: updateError } = await admin
            .from("subscriptions")
            .update({
              status: status as "active",
              current_period_start: new Date(item.current_period_start * 1000).toISOString(),
              current_period_end: new Date(item.current_period_end * 1000).toISOString(),
              cancel_at_period_end: sub.cancel_at_period_end,
            })
            .eq("stripe_subscription_id", sub.id);
          if (updateError) {
            console.error("Supabase update failed:", updateError);
            return NextResponse.json({ error: "Database error" }, { status: 500 });
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { error: deleteError } = await admin
          .from("subscriptions")
          .update({ status: "canceled", cancel_at_period_end: false })
          .eq("stripe_subscription_id", sub.id);
        if (deleteError) {
          console.error("Supabase update (cancel) failed:", deleteError);
          return NextResponse.json({ error: "Database error" }, { status: 500 });
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
