import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import type { Feature } from "@/lib/types/app";
import FeatureBoard from "./feature-board";

export default async function FeedbackPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let features: Feature[] = [];
  const { data } = await supabase
    .from("features")
    .select("*")
    .order("upvote_count", { ascending: false });

  if (data) {
    if (user) {
      const { data: upvotes } = await supabase
        .from("feature_upvotes")
        .select("feature_id")
        .eq("user_id", user.id);

      const upvotedSet = new Set(upvotes?.map((u) => u.feature_id) ?? []);
      features = data.map((f) => ({
        ...f,
        user_has_upvoted: upvotedSet.has(f.id),
      })) as Feature[];
    } else {
      features = data.map((f) => ({
        ...f,
        user_has_upvoted: false,
      })) as Feature[];
    }
  }

  // Get user plan for upvote gating
  let userPlan: string | null = null;
  if (user) {
    const { data: planData } = await supabase.rpc("get_user_plan", {
      target_user_id: user.id,
    });
    userPlan = planData ?? "free";
  }

  return (
    <FeatureBoard
      initialFeatures={features}
      userId={user?.id ?? null}
      userEmail={user?.email ?? null}
      userPlan={userPlan}
      isAdmin={user ? isAdmin(user.id) : false}
    />
  );
}
