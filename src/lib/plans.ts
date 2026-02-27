import type { PlanType, PlanLimits } from "@/lib/types/app";

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    searchesPerDay: 50,
    savedPapers: 50,
    collections: 1,
    aiSummariesOnDemand: false,
    exportEnabled: false,
  },
  alpha: {
    searchesPerDay: 100,
    savedPapers: null,
    collections: 5,
    aiSummariesOnDemand: false,
    exportEnabled: true,
  },
  researcher: {
    searchesPerDay: null, // unlimited
    savedPapers: null,
    collections: null,
    aiSummariesOnDemand: true,
    exportEnabled: true,
  },
  lab: {
    searchesPerDay: null,
    savedPapers: null,
    collections: null,
    aiSummariesOnDemand: true,
    exportEnabled: true,
  },
};

export const PLAN_DISPLAY: Record<PlanType, { name: string; price: string; yearlyPrice: string }> = {
  free: { name: "Explorer", price: "Free", yearlyPrice: "Free" },
  alpha: { name: "Alpha", price: "Free", yearlyPrice: "Free" },
  researcher: { name: "Researcher", price: "$8/mo", yearlyPrice: "$80/yr" },
  lab: { name: "Lab", price: "$8/member/mo", yearlyPrice: "$80/member/yr" },
};

export function isPaid(plan: PlanType): boolean {
  return plan === "alpha" || plan === "researcher" || plan === "lab";
}
