import type { PlanType, PlanLimits } from "@/lib/types/app";

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    searchesPerDay: 50,
    savedPapers: 50,
    collections: 1,
    aiSummariesOnDemand: false,
    exportEnabled: false,
    labCollections: 0,
    labMembers: 0,
    journalClubsPerMonth: 0,
    fileStorageMb: 0,
    announcementsEnabled: false,
    journalClubEnabled: false,
    labNotesEnabled: false,
  },
  alpha: {
    searchesPerDay: 100,
    savedPapers: null,
    collections: 5,
    aiSummariesOnDemand: false,
    exportEnabled: true,
    labCollections: 0,
    labMembers: 0,
    journalClubsPerMonth: 0,
    fileStorageMb: 0,
    announcementsEnabled: false,
    journalClubEnabled: false,
    labNotesEnabled: false,
  },
  researcher: {
    searchesPerDay: null, // unlimited
    savedPapers: null,
    collections: null,
    aiSummariesOnDemand: true,
    exportEnabled: true,
    labCollections: 0,
    labMembers: 0,
    journalClubsPerMonth: 0,
    fileStorageMb: 0,
    announcementsEnabled: false,
    journalClubEnabled: false,
    labNotesEnabled: false,
  },
  lab: {
    searchesPerDay: null,
    savedPapers: null,
    collections: null,
    aiSummariesOnDemand: true,
    exportEnabled: true,
    labCollections: null, // unlimited
    labMembers: null, // unlimited
    journalClubsPerMonth: null, // unlimited
    fileStorageMb: 500,
    announcementsEnabled: true,
    journalClubEnabled: true,
    labNotesEnabled: true,
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
