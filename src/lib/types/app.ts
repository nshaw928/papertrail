export interface TopicNode {
  id: string;
  name: string;
  level: number;
  parent_topic_id: string | null;
  works_count: number | null;
}

export interface WorkWithRelations {
  id: string;
  title: string;
  abstract: string | null;
  year: number | null;
  doi: string | null;
  cited_by_count: number | null;
  publication_date: string | null;
  type: string | null;
  language: string | null;
  is_retracted: boolean | null;
  is_open_access: boolean | null;
  open_access_url: string | null;
  fwci: number | null;
  counts_by_year: unknown;
  biblio: unknown;
  keywords: unknown;
  sustainable_development_goals: unknown;
  mesh: unknown;
  indexed_in: string[] | null;
  is_stub: boolean | null;
  source_id: string | null;
  source_display_name: string | null;
  ai_summary: string | null;
  citations_fetched: boolean | null;
  authors: {
    id: string;
    display_name: string;
    orcid: string | null;
    position: number | null;
    is_corresponding: boolean | null;
  }[];
  topics: {
    id: string;
    name: string;
    level: number;
    score: number | null;
    is_primary: boolean | null;
  }[];
  is_saved?: boolean;
  note_count?: number;
}

export interface SearchResult {
  results: WorkWithRelations[];
  count: number;
  page: number;
  per_page: number;
}

export interface Collection {
  id: string;
  name: string;
  created_at: string;
  work_count?: number;
}

export interface LibraryGraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: "paper" | "topic";
    level?: number;
    year?: number | null;
    cited_by_count?: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: "has_topic" | "cites" | "topic_parent";
  }>;
}

export interface TopicWithChildren {
  id: string;
  name: string;
  level: number;
  description: string | null;
  works_count: number | null;
  parent_topic_id: string | null;
  children: TopicWithChildren[];
  paper_count?: number;
}

// ---- Saved Searches ----

export interface SavedSearch {
  id: string;
  query: string;
  from_year: number | null;
  to_year: number | null;
  sort: string | null;
  result_count: number;
  work_ids: string[];
  cache_id: string | null;
  created_at: string;
}

// ---- Paper Notes ----

export interface PaperNote {
  id: string;
  work_id: string;
  content: string;
  anchor_page: number | null;
  anchor_y: number | null;
  anchor_quote: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// ---- Plans & Subscriptions ----

export type PlanType = "free" | "alpha" | "researcher" | "lab";

export interface UserPlan {
  plan: PlanType;
  status: "active" | "canceled" | "past_due" | "trialing" | "incomplete";
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface PlanLimits {
  searchesPerDay: number | null; // null = unlimited
  savedPapers: number | null;
  collections: number | null;
  aiSummariesOnDemand: boolean;
  exportEnabled: boolean;
}

// ---- Labs ----

export interface Lab {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

export interface LabMember {
  user_id: string;
  email?: string;
  display_name?: string;
  role: "owner" | "admin" | "member";
  joined_at: string | null;
}

export interface LabInvitation {
  id: string;
  lab_id: string;
  lab_name?: string;
  email: string;
  role: "owner" | "admin" | "member";
  created_at: string;
  expires_at: string;
}

// ---- Usage ----

export interface DailyUsage {
  search_count: number;
  ai_summary_requests: number;
  papers_saved: number;
}

// ---- Features & Feedback ----

export type FeatureStatus = "planned" | "in_progress" | "shipped" | "considering";
export type FeedbackCategory = "general" | "bug" | "feature_request" | "other";

export interface Feature {
  id: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  priority: number;
  upvote_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  user_has_upvoted?: boolean;
}

export interface FeatureComment {
  id: string;
  feature_id: string;
  user_id: string;
  user_email: string;
  content: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string | null;
  email: string | null;
  category: FeedbackCategory;
  content: string;
  created_at: string;
}

// ---- Waitlist & Invites ----

export interface WaitlistEntry {
  id: string;
  email: string;
  source: string | null;
  created_at: string;
}

export interface InviteLink {
  id: string;
  code: string;
  email: string | null;
  created_by: string;
  used_by: string | null;
  used_at: string | null;
  expires_at: string;
  created_at: string;
}
