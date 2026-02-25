import { createClient } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/supabase/plans";
import PricingCards from "./pricing-cards";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const userPlan = user ? await getUserPlan(supabase, user.id) : null;

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Plans & Pricing</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Start free. Upgrade when you need unlimited searches, AI summaries, and collaboration.
        </p>
      </div>
      <PricingCards currentPlan={userPlan?.plan ?? "free"} isLoggedIn={!!user} />
    </div>
  );
}
