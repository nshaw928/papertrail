import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "./client";

/**
 * Sync the Stripe subscription quantity for a lab to match the actual member count.
 * Fire-and-forget — logs errors but never throws.
 */
export async function syncLabSeatCount(labId: string): Promise<void> {
  try {
    const admin = createAdminClient();

    // Count current lab members
    const { count, error: countError } = await admin
      .from("lab_members")
      .select("*", { count: "exact", head: true })
      .eq("lab_id", labId);

    if (countError || count === null) {
      console.error("syncLabSeatCount: failed to count members:", countError?.message);
      return;
    }

    // Find the active lab subscription for this lab
    const { data: sub, error: subError } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("lab_id", labId)
      .eq("plan", "lab")
      .in("status", ["active", "trialing"])
      .limit(1)
      .single();

    if (subError || !sub?.stripe_subscription_id) {
      console.error("syncLabSeatCount: no active lab subscription for lab", labId);
      return;
    }

    const stripe = getStripe();
    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = stripeSub.items.data[0];
    if (!item) {
      console.error("syncLabSeatCount: subscription has no items:", sub.stripe_subscription_id);
      return;
    }

    const desiredQuantity = Math.max(1, count);
    if (item.quantity === desiredQuantity) return;

    await stripe.subscriptionItems.update(item.id, {
      quantity: desiredQuantity,
      proration_behavior: "create_prorations",
    });
  } catch (err) {
    console.error("syncLabSeatCount error:", err);
  }
}
