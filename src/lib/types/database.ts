export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_jobs: {
        Row: {
          id: string
          work_id: string
          user_id: string | null
          priority: number
          status: string
          source_url: string | null
          error: string | null
          created_at: string | null
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          work_id: string
          user_id?: string | null
          priority?: number
          status?: string
          source_url?: string | null
          error?: string | null
          created_at?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          work_id?: string
          user_id?: string | null
          priority?: number
          status?: string
          source_url?: string | null
          error?: string | null
          created_at?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_jobs_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      author_institutions: {
        Row: {
          author_id: string
          institution_id: string
          years: Json | null
        }
        Insert: {
          author_id: string
          institution_id: string
          years?: Json | null
        }
        Update: {
          author_id?: string
          institution_id?: string
          years?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "author_institutions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "author_institutions_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_works: {
        Row: {
          added_at: string | null
          collection_id: string
          work_id: string
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          work_id: string
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_works_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_works_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          cited_by_count: number | null
          counts_by_year: Json | null
          created_at: string | null
          display_name: string
          display_name_alternatives: string[] | null
          h_index: number | null
          i10_index: number | null
          id: string
          orcid: string | null
          scopus_id: string | null
          twitter: string | null
          two_yr_mean_citedness: number | null
          updated_at: string | null
          wikipedia: string | null
        }
        Insert: {
          cited_by_count?: number | null
          counts_by_year?: Json | null
          created_at?: string | null
          display_name: string
          display_name_alternatives?: string[] | null
          h_index?: number | null
          i10_index?: number | null
          id: string
          orcid?: string | null
          scopus_id?: string | null
          twitter?: string | null
          two_yr_mean_citedness?: number | null
          updated_at?: string | null
          wikipedia?: string | null
        }
        Update: {
          cited_by_count?: number | null
          counts_by_year?: Json | null
          created_at?: string | null
          display_name?: string
          display_name_alternatives?: string[] | null
          h_index?: number | null
          i10_index?: number | null
          id?: string
          orcid?: string | null
          scopus_id?: string | null
          twitter?: string | null
          two_yr_mean_citedness?: number | null
          updated_at?: string | null
          wikipedia?: string | null
        }
        Relationships: []
      }
      funders: {
        Row: {
          country_code: string | null
          created_at: string | null
          grants_count: number | null
          homepage_url: string | null
          id: string
          name: string
          updated_at: string | null
          works_count: number | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          grants_count?: number | null
          homepage_url?: string | null
          id: string
          name: string
          updated_at?: string | null
          works_count?: number | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          grants_count?: number | null
          homepage_url?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          works_count?: number | null
        }
        Relationships: []
      }
      institutions: {
        Row: {
          country_code: string | null
          created_at: string | null
          homepage_url: string | null
          id: string
          image_url: string | null
          name: string
          ror_id: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string | null
          homepage_url?: string | null
          id: string
          image_url?: string | null
          name: string
          ror_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string | null
          homepage_url?: string | null
          id?: string
          image_url?: string | null
          name?: string
          ror_id?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      saved_works: {
        Row: {
          id: string
          notes: string | null
          saved_at: string | null
          user_id: string
          work_id: string
        }
        Insert: {
          id?: string
          notes?: string | null
          saved_at?: string | null
          user_id: string
          work_id: string
        }
        Update: {
          id?: string
          notes?: string | null
          saved_at?: string | null
          user_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_works_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      sources: {
        Row: {
          apc_usd: number | null
          created_at: string | null
          homepage_url: string | null
          host_organization_name: string | null
          id: string
          is_oa: boolean | null
          issn: string[] | null
          name: string
          type: string | null
          updated_at: string | null
        }
        Insert: {
          apc_usd?: number | null
          created_at?: string | null
          homepage_url?: string | null
          host_organization_name?: string | null
          id: string
          is_oa?: boolean | null
          issn?: string[] | null
          name: string
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          apc_usd?: number | null
          created_at?: string | null
          homepage_url?: string | null
          host_organization_name?: string | null
          id?: string
          is_oa?: boolean | null
          issn?: string[] | null
          name?: string
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      topics: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          keywords: Json | null
          level: number
          name: string
          parent_topic_id: string | null
          updated_at: string | null
          works_count: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id: string
          keywords?: Json | null
          level: number
          name: string
          parent_topic_id?: string | null
          updated_at?: string | null
          works_count?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          keywords?: Json | null
          level?: number
          name?: string
          parent_topic_id?: string | null
          updated_at?: string | null
          works_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      work_authors: {
        Row: {
          author_id: string
          is_corresponding: boolean | null
          position: number | null
          work_id: string
        }
        Insert: {
          author_id: string
          is_corresponding?: boolean | null
          position?: number | null
          work_id: string
        }
        Update: {
          author_id?: string
          is_corresponding?: boolean | null
          position?: number | null
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_authors_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "authors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_authors_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      work_citations: {
        Row: {
          cited_work_id: string
          citing_work_id: string
        }
        Insert: {
          cited_work_id: string
          citing_work_id: string
        }
        Update: {
          cited_work_id?: string
          citing_work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_citations_cited_work_id_fkey"
            columns: ["cited_work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_citations_citing_work_id_fkey"
            columns: ["citing_work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      work_funders: {
        Row: {
          award_id: string | null
          funder_id: string
          work_id: string
        }
        Insert: {
          award_id?: string | null
          funder_id: string
          work_id: string
        }
        Update: {
          award_id?: string | null
          funder_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_funders_funder_id_fkey"
            columns: ["funder_id"]
            isOneToOne: false
            referencedRelation: "funders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_funders_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      work_topics: {
        Row: {
          is_primary: boolean | null
          score: number | null
          topic_id: string
          work_id: string
        }
        Insert: {
          is_primary?: boolean | null
          score?: number | null
          topic_id: string
          work_id: string
        }
        Update: {
          is_primary?: boolean | null
          score?: number | null
          topic_id?: string
          work_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_topics_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          abstract: string | null
          ai_summary: string | null
          ai_summary_generated: boolean | null
          biblio: Json | null
          citations_fetched: boolean | null
          cited_by_count: number | null
          counts_by_year: Json | null
          created_at: string | null
          doi: string | null
          fts: unknown
          fwci: number | null
          id: string
          indexed_in: string[] | null
          is_open_access: boolean | null
          is_retracted: boolean | null
          is_stub: boolean | null
          keywords: Json | null
          language: string | null
          mesh: Json | null
          open_access_url: string | null
          publication_date: string | null
          related_work_ids: string[] | null
          source_display_name: string | null
          source_id: string | null
          sustainable_development_goals: Json | null
          title: string
          type: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          abstract?: string | null
          ai_summary?: string | null
          ai_summary_generated?: boolean | null
          biblio?: Json | null
          citations_fetched?: boolean | null
          cited_by_count?: number | null
          counts_by_year?: Json | null
          created_at?: string | null
          doi?: string | null
          fts?: unknown
          fwci?: number | null
          id: string
          indexed_in?: string[] | null
          is_open_access?: boolean | null
          is_retracted?: boolean | null
          is_stub?: boolean | null
          keywords?: Json | null
          language?: string | null
          mesh?: Json | null
          open_access_url?: string | null
          publication_date?: string | null
          related_work_ids?: string[] | null
          source_display_name?: string | null
          source_id?: string | null
          sustainable_development_goals?: Json | null
          title: string
          type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          abstract?: string | null
          ai_summary?: string | null
          ai_summary_generated?: boolean | null
          biblio?: Json | null
          citations_fetched?: boolean | null
          cited_by_count?: number | null
          counts_by_year?: Json | null
          created_at?: string | null
          doi?: string | null
          fts?: unknown
          fwci?: number | null
          id?: string
          indexed_in?: string[] | null
          is_open_access?: boolean | null
          is_retracted?: boolean | null
          is_stub?: boolean | null
          keywords?: Json | null
          language?: string | null
          mesh?: Json | null
          open_access_url?: string | null
          publication_date?: string | null
          related_work_ids?: string[] | null
          source_display_name?: string | null
          source_id?: string | null
          sustainable_development_goals?: Json | null
          title?: string
          type?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "works_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "sources"
            referencedColumns: ["id"]
          },
        ]
      }
    lab_invitations: {
      Row: {
        id: string
        lab_id: string
        email: string
        role: Database["public"]["Enums"]["lab_role"]
        invited_by: string
        created_at: string | null
        expires_at: string | null
      }
      Insert: {
        id?: string
        lab_id: string
        email: string
        role?: Database["public"]["Enums"]["lab_role"]
        invited_by: string
        created_at?: string | null
        expires_at?: string | null
      }
      Update: {
        id?: string
        lab_id?: string
        email?: string
        role?: Database["public"]["Enums"]["lab_role"]
        invited_by?: string
        created_at?: string | null
        expires_at?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "lab_invitations_lab_id_fkey"
          columns: ["lab_id"]
          isOneToOne: false
          referencedRelation: "labs"
          referencedColumns: ["id"]
        },
      ]
    }
    lab_members: {
      Row: {
        lab_id: string
        user_id: string
        role: Database["public"]["Enums"]["lab_role"]
        invited_by: string | null
        invited_email: string | null
        invited_at: string | null
        joined_at: string | null
      }
      Insert: {
        lab_id: string
        user_id: string
        role?: Database["public"]["Enums"]["lab_role"]
        invited_by?: string | null
        invited_email?: string | null
        invited_at?: string | null
        joined_at?: string | null
      }
      Update: {
        lab_id?: string
        user_id?: string
        role?: Database["public"]["Enums"]["lab_role"]
        invited_by?: string | null
        invited_email?: string | null
        invited_at?: string | null
        joined_at?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "lab_members_lab_id_fkey"
          columns: ["lab_id"]
          isOneToOne: false
          referencedRelation: "labs"
          referencedColumns: ["id"]
        },
      ]
    }
    labs: {
      Row: {
        id: string
        name: string
        owner_id: string
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id?: string
        name: string
        owner_id: string
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        name?: string
        owner_id?: string
        created_at?: string | null
        updated_at?: string | null
      }
      Relationships: []
    }
    subscriptions: {
      Row: {
        id: string
        user_id: string
        lab_id: string | null
        stripe_customer_id: string | null
        stripe_subscription_id: string | null
        plan: Database["public"]["Enums"]["plan_type"]
        status: Database["public"]["Enums"]["subscription_status"]
        current_period_start: string | null
        current_period_end: string | null
        cancel_at_period_end: boolean | null
        created_at: string | null
        updated_at: string | null
      }
      Insert: {
        id?: string
        user_id: string
        lab_id?: string | null
        stripe_customer_id?: string | null
        stripe_subscription_id?: string | null
        plan?: Database["public"]["Enums"]["plan_type"]
        status?: Database["public"]["Enums"]["subscription_status"]
        current_period_start?: string | null
        current_period_end?: string | null
        cancel_at_period_end?: boolean | null
        created_at?: string | null
        updated_at?: string | null
      }
      Update: {
        id?: string
        user_id?: string
        lab_id?: string | null
        stripe_customer_id?: string | null
        stripe_subscription_id?: string | null
        plan?: Database["public"]["Enums"]["plan_type"]
        status?: Database["public"]["Enums"]["subscription_status"]
        current_period_start?: string | null
        current_period_end?: string | null
        cancel_at_period_end?: boolean | null
        created_at?: string | null
        updated_at?: string | null
      }
      Relationships: [
        {
          foreignKeyName: "subscriptions_lab_id_fkey"
          columns: ["lab_id"]
          isOneToOne: false
          referencedRelation: "labs"
          referencedColumns: ["id"]
        },
      ]
    }
    usage_daily: {
      Row: {
        user_id: string
        date: string
        search_count: number
        ai_summary_requests: number
        papers_saved: number
      }
      Insert: {
        user_id: string
        date?: string
        search_count?: number
        ai_summary_requests?: number
        papers_saved?: number
      }
      Update: {
        user_id?: string
        date?: string
        search_count?: number
        ai_summary_requests?: number
        papers_saved?: number
      }
      Relationships: []
    }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_citation_graph: {
        Args: { max_nodes?: number; target_work_id: string }
        Returns: Json
      }
      get_user_plan: {
        Args: { target_user_id: string }
        Returns: Database["public"]["Enums"]["plan_type"]
      }
      increment_usage: {
        Args: { target_user_id: string; field: string; amount?: number }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      plan_type: "free" | "researcher" | "lab"
      subscription_status: "active" | "canceled" | "past_due" | "trialing" | "incomplete"
      lab_role: "owner" | "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      plan_type: ["free", "researcher", "lab"] as const,
      subscription_status: ["active", "canceled", "past_due", "trialing", "incomplete"] as const,
      lab_role: ["owner", "admin", "member"] as const,
    },
  },
} as const
