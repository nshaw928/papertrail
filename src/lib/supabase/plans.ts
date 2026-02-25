import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanType, UserPlan, DailyUsage } from "@/lib/types/app";
import { PLAN_LIMITS } from "@/lib/plans";

/**
 * Get a user's current plan from the subscriptions table.
 * Falls back to 'free' if no active subscription exists.
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPlan> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, current_period_end, cancel_at_period_end")
    .eq("user_id", userId)
    .in("status", ["active", "trialing"])
    .limit(1)
    .single();

  if (!data) {
    return {
      plan: "free",
      status: "active",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    };
  }

  return {
    plan: data.plan as PlanType,
    status: data.status,
    currentPeriodEnd: data.current_period_end,
    cancelAtPeriodEnd: data.cancel_at_period_end ?? false,
  };
}

/**
 * Get today's usage for a user.
 */
export async function getDailyUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<DailyUsage> {
  const today = new Date().toISOString().split("T")[0];
  const { data } = await supabase
    .from("usage_daily")
    .select("search_count, ai_summary_requests, papers_saved")
    .eq("user_id", userId)
    .eq("date", today)
    .single();

  return {
    search_count: data?.search_count ?? 0,
    ai_summary_requests: data?.ai_summary_requests ?? 0,
    papers_saved: data?.papers_saved ?? 0,
  };
}

/**
 * Check if a user can perform an action given their plan and current usage.
 * Returns { allowed: true } or { allowed: false, reason: string }.
 */
export async function checkLimit(
  supabase: SupabaseClient,
  userId: string,
  action: "search" | "save_paper" | "create_collection" | "ai_summary" | "export"
): Promise<{ allowed: true } | { allowed: false; reason: string }> {
  const userPlan = await getUserPlan(supabase, userId);
  const limits = PLAN_LIMITS[userPlan.plan];

  switch (action) {
    case "search": {
      if (limits.searchesPerDay === null) return { allowed: true };
      const usage = await getDailyUsage(supabase, userId);
      if (usage.search_count >= limits.searchesPerDay) {
        return {
          allowed: false,
          reason: `Free plan limited to ${limits.searchesPerDay} searches/day. Upgrade for unlimited.`,
        };
      }
      return { allowed: true };
    }

    case "save_paper": {
      if (limits.savedPapers === null) return { allowed: true };
      const { count } = await supabase
        .from("saved_works")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) >= limits.savedPapers) {
        return {
          allowed: false,
          reason: `Free plan limited to ${limits.savedPapers} saved papers. Upgrade for unlimited.`,
        };
      }
      return { allowed: true };
    }

    case "create_collection": {
      if (limits.collections === null) return { allowed: true };
      const { count } = await supabase
        .from("collections")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      if ((count ?? 0) >= limits.collections) {
        return {
          allowed: false,
          reason: `Free plan limited to ${limits.collections} collection${limits.collections === 1 ? "" : "s"}. Upgrade for unlimited.`,
        };
      }
      return { allowed: true };
    }

    case "ai_summary": {
      if (!limits.aiSummariesOnDemand) {
        return {
          allowed: false,
          reason: "On-demand AI summaries require a paid plan.",
        };
      }
      return { allowed: true };
    }

    case "export": {
      if (!limits.exportEnabled) {
        return {
          allowed: false,
          reason: "Export requires a paid plan.",
        };
      }
      return { allowed: true };
    }
  }
}

