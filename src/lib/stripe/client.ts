import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    });
  }
  return _stripe;
}

// Stripe Price IDs — set these in env after creating products in Stripe dashboard.
// Values may be undefined in dev/build; the checkout route validates before use.
export const PRICE_IDS: Record<string, string | undefined> = {
  researcher_monthly: process.env.STRIPE_PRICE_RESEARCHER_MONTHLY,
  researcher_yearly: process.env.STRIPE_PRICE_RESEARCHER_YEARLY,
  lab_monthly: process.env.STRIPE_PRICE_LAB_MONTHLY,
  lab_yearly: process.env.STRIPE_PRICE_LAB_YEARLY,
};
