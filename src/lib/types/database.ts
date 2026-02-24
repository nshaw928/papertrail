// Placeholder — regenerate with: npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
// For now, manually define types matching our schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          country_code: string | null;
          ror_id: string | null;
          homepage_url: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          type?: string | null;
          country_code?: string | null;
          ror_id?: string | null;
          homepage_url?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          country_code?: string | null;
          ror_id?: string | null;
          homepage_url?: string | null;
          image_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sources: {
        Row: {
          id: string;
          name: string;
          type: string | null;
          issn: string[] | null;
          is_oa: boolean;
          homepage_url: string | null;
          host_organization_name: string | null;
          apc_usd: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          type?: string | null;
          issn?: string[] | null;
          is_oa?: boolean;
          homepage_url?: string | null;
          host_organization_name?: string | null;
          apc_usd?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          type?: string | null;
          issn?: string[] | null;
          is_oa?: boolean;
          homepage_url?: string | null;
          host_organization_name?: string | null;
          apc_usd?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      funders: {
        Row: {
          id: string;
          name: string;
          country_code: string | null;
          homepage_url: string | null;
          grants_count: number;
          works_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          country_code?: string | null;
          homepage_url?: string | null;
          grants_count?: number;
          works_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          country_code?: string | null;
          homepage_url?: string | null;
          grants_count?: number;
          works_count?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      authors: {
        Row: {
          id: string;
          display_name: string;
          orcid: string | null;
          cited_by_count: number;
          h_index: number;
          i10_index: number;
          two_yr_mean_citedness: number;
          counts_by_year: Json | null;
          display_name_alternatives: string[] | null;
          scopus_id: string | null;
          twitter: string | null;
          wikipedia: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          orcid?: string | null;
          cited_by_count?: number;
          h_index?: number;
          i10_index?: number;
          two_yr_mean_citedness?: number;
          counts_by_year?: Json | null;
          display_name_alternatives?: string[] | null;
          scopus_id?: string | null;
          twitter?: string | null;
          wikipedia?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          orcid?: string | null;
          cited_by_count?: number;
          h_index?: number;
          i10_index?: number;
          two_yr_mean_citedness?: number;
          counts_by_year?: Json | null;
          display_name_alternatives?: string[] | null;
          scopus_id?: string | null;
          twitter?: string | null;
          wikipedia?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          id: string;
          name: string;
          level: number;
          parent_topic_id: string | null;
          description: string | null;
          keywords: Json | null;
          works_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          level: number;
          parent_topic_id?: string | null;
          description?: string | null;
          keywords?: Json | null;
          works_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          level?: number;
          parent_topic_id?: string | null;
          description?: string | null;
          keywords?: Json | null;
          works_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topics_parent_topic_id_fkey";
            columns: ["parent_topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
      works: {
        Row: {
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
          counts_by_year: Json | null;
          biblio: Json | null;
          keywords: Json | null;
          sustainable_development_goals: Json | null;
          related_work_ids: string[] | null;
          mesh: Json | null;
          indexed_in: string[] | null;
          is_stub: boolean;
          source_id: string | null;
          source_display_name: string | null;
          summary: string | null;
          ai_tags: Json | null;
          citations_fetched: boolean;
          summary_generated: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          title: string;
          abstract?: string | null;
          year?: number | null;
          doi?: string | null;
          cited_by_count?: number;
          publication_date?: string | null;
          type?: string | null;
          language?: string | null;
          is_retracted?: boolean;
          is_open_access?: boolean;
          open_access_url?: string | null;
          fwci?: number | null;
          counts_by_year?: Json | null;
          biblio?: Json | null;
          keywords?: Json | null;
          sustainable_development_goals?: Json | null;
          related_work_ids?: string[] | null;
          mesh?: Json | null;
          indexed_in?: string[] | null;
          is_stub?: boolean;
          source_id?: string | null;
          source_display_name?: string | null;
          summary?: string | null;
          ai_tags?: Json | null;
          citations_fetched?: boolean;
          summary_generated?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          abstract?: string | null;
          year?: number | null;
          doi?: string | null;
          cited_by_count?: number;
          publication_date?: string | null;
          type?: string | null;
          language?: string | null;
          is_retracted?: boolean;
          is_open_access?: boolean;
          open_access_url?: string | null;
          fwci?: number | null;
          counts_by_year?: Json | null;
          biblio?: Json | null;
          keywords?: Json | null;
          sustainable_development_goals?: Json | null;
          related_work_ids?: string[] | null;
          mesh?: Json | null;
          indexed_in?: string[] | null;
          is_stub?: boolean;
          source_id?: string | null;
          source_display_name?: string | null;
          summary?: string | null;
          ai_tags?: Json | null;
          citations_fetched?: boolean;
          summary_generated?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "works_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          }
        ];
      };
      work_authors: {
        Row: {
          work_id: string;
          author_id: string;
          position: number;
          is_corresponding: boolean;
        };
        Insert: {
          work_id: string;
          author_id: string;
          position?: number;
          is_corresponding?: boolean;
        };
        Update: {
          work_id?: string;
          author_id?: string;
          position?: number;
          is_corresponding?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "work_authors_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_authors_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "authors";
            referencedColumns: ["id"];
          }
        ];
      };
      work_topics: {
        Row: {
          work_id: string;
          topic_id: string;
          score: number;
          is_primary: boolean;
        };
        Insert: {
          work_id: string;
          topic_id: string;
          score?: number;
          is_primary?: boolean;
        };
        Update: {
          work_id?: string;
          topic_id?: string;
          score?: number;
          is_primary?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "work_topics_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_topics_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          }
        ];
      };
      work_citations: {
        Row: {
          citing_work_id: string;
          cited_work_id: string;
        };
        Insert: {
          citing_work_id: string;
          cited_work_id: string;
        };
        Update: {
          citing_work_id?: string;
          cited_work_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_citations_citing_work_id_fkey";
            columns: ["citing_work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_citations_cited_work_id_fkey";
            columns: ["cited_work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          }
        ];
      };
      work_funders: {
        Row: {
          work_id: string;
          funder_id: string;
          award_id: string | null;
        };
        Insert: {
          work_id: string;
          funder_id: string;
          award_id?: string | null;
        };
        Update: {
          work_id?: string;
          funder_id?: string;
          award_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "work_funders_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "work_funders_funder_id_fkey";
            columns: ["funder_id"];
            isOneToOne: false;
            referencedRelation: "funders";
            referencedColumns: ["id"];
          }
        ];
      };
      author_institutions: {
        Row: {
          author_id: string;
          institution_id: string;
          years: Json | null;
        };
        Insert: {
          author_id: string;
          institution_id: string;
          years?: Json | null;
        };
        Update: {
          author_id?: string;
          institution_id?: string;
          years?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "author_institutions_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "authors";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "author_institutions_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          }
        ];
      };
      saved_works: {
        Row: {
          id: string;
          user_id: string;
          work_id: string;
          notes: string | null;
          saved_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          work_id: string;
          notes?: string | null;
          saved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          work_id?: string;
          notes?: string | null;
          saved_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_works_work_id_fkey";
            columns: ["work_id"];
            isOneToOne: false;
            referencedRelation: "works";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_citation_graph: {
        Args: { target_work_id: string; max_nodes?: number };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
