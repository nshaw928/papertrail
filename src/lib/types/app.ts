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
  summary: string | null;
  ai_tags: unknown;
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
  works_count: number | null;
  parent_topic_id: string | null;
  children: TopicWithChildren[];
  paper_count?: number;
}
