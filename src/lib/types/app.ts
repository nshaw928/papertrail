export interface GraphNode {
  id: string;
  label: string;
  type: "paper" | "topic";
  year?: number | null;
  cited_by_count?: number | null;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: "cites" | "has_topic";
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface WorkWithRelations {
  id: string;
  title: string;
  abstract: string | null;
  year: number | null;
  doi: string | null;
  cited_by_count: number;
  publication_date: string | null;
  type: string | null;
  language: string | null;
  is_retracted: boolean;
  is_open_access: boolean;
  open_access_url: string | null;
  fwci: number | null;
  counts_by_year: Record<string, unknown>[] | null;
  biblio: Record<string, string | null> | null;
  keywords: { display_name: string; score?: number }[] | null;
  sustainable_development_goals: { display_name: string; score?: number }[] | null;
  mesh: Record<string, unknown>[] | null;
  indexed_in: string[] | null;
  is_stub: boolean;
  source_id: string | null;
  source_display_name: string | null;
  summary: string | null;
  ai_tags: Record<string, unknown> | null;
  citations_fetched: boolean;
  authors: {
    id: string;
    display_name: string;
    orcid: string | null;
    position: number;
    is_corresponding: boolean;
  }[];
  topics: {
    id: string;
    name: string;
    level: number;
    score: number;
    is_primary: boolean;
  }[];
  is_saved?: boolean;
}

export interface SearchResult {
  results: WorkWithRelations[];
  count: number;
  page: number;
  per_page: number;
}

export interface TopicWithChildren {
  id: string;
  name: string;
  level: number;
  description: string | null;
  works_count: number;
  parent_topic_id: string | null;
  children: TopicWithChildren[];
  paper_count?: number;
}
