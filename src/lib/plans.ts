import type { PlanType, PlanLimits } from "@/lib/types/app";

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    searchesPerDay: 50,
    savedPapers: 50,
    collections: 1,
    aiSummariesOnDemand: false,
    exportEnabled: false,
    citationGraphHops: 1,
  },
  researcher: {
    searchesPerDay: null, // unlimited
    savedPapers: null,
    collections: null,
    aiSummariesOnDemand: true,
    exportEnabled: true,
    citationGraphHops: 3,
  },
  lab: {
    searchesPerDay: null,
    savedPapers: null,
    collections: null,
    aiSummariesOnDemand: true,
    exportEnabled: true,
    citationGraphHops: 3,
  },
};

export const PLAN_DISPLAY: Record<PlanType, { name: string; price: string; yearlyPrice: string }> = {
  free: { name: "Explorer", price: "Free", yearlyPrice: "Free" },
  researcher: { name: "Researcher", price: "$8/mo", yearlyPrice: "$80/yr" },
  lab: { name: "Lab", price: "$8/member/mo", yearlyPrice: "$80/member/yr" },
};

export function isPaid(plan: PlanType): boolean {
  return plan === "researcher" || plan === "lab";
}
