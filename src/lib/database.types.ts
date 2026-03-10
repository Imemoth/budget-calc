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
    PostgrestVersion: "13.0.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          household_id: string
          id: string
          name: string
          order_index: number
          parent_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          name: string
          order_index?: number
          parent_id?: string | null
          type: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          name?: string
          order_index?: number
          parent_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          converted_user_id: string | null
          created_at: string
          id: string
          last_active_at: string
        }
        Insert: {
          converted_user_id?: string | null
          created_at?: string
          id?: string
          last_active_at?: string
        }
        Update: {
          converted_user_id?: string | null
          created_at?: string
          id?: string
          last_active_at?: string
        }
        Relationships: []
      }
      household_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string
          household_id: string
          id: string
          invited_by: string
          invited_email: string
          permissions: Json
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string
          household_id: string
          id?: string
          invited_by: string
          invited_email: string
          permissions?: Json
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          invited_by?: string
          invited_email?: string
          permissions?: Json
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_invites_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      household_members: {
        Row: {
          created_at: string
          email: string | null
          household_id: string
          id: string
          permissions: Json
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          household_id: string
          id?: string
          permissions?: Json
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          household_id?: string
          id?: string
          permissions?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_members_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          created_at: string
          currency: string
          horizon_months: number
          id: string
          name: string
          owner_user_id: string
          start_month: string
          theme: string | null
        }
        Insert: {
          created_at?: string
          currency?: string
          horizon_months?: number
          id?: string
          name: string
          owner_user_id: string
          start_month: string
          theme?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          horizon_months?: number
          id?: string
          name?: string
          owner_user_id?: string
          start_month?: string
          theme?: string | null
        }
        Relationships: []
      }
      people: {
        Row: {
          color_index: number
          created_at: string
          household_id: string
          id: string
          name: string
        }
        Insert: {
          color_index?: number
          created_at?: string
          household_id: string
          id?: string
          name: string
        }
        Update: {
          color_index?: number
          created_at?: string
          household_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string | null
        }
        Relationships: []
      }
      recurring_items: {
        Row: {
          amount: number
          cadence: string
          category_id: string | null
          created_at: string
          day_of_month: number
          enabled: boolean
          end_month: string | null
          household_id: string
          id: string
          name: string
          notes: string | null
          person_id: string | null
          start_month: string
          type: string
        }
        Insert: {
          amount?: number
          cadence?: string
          category_id?: string | null
          created_at?: string
          day_of_month?: number
          enabled?: boolean
          end_month?: string | null
          household_id: string
          id?: string
          name: string
          notes?: string | null
          person_id?: string | null
          start_month: string
          type: string
        }
        Update: {
          amount?: number
          cadence?: string
          category_id?: string | null
          created_at?: string
          day_of_month?: number
          enabled?: boolean
          end_month?: string | null
          household_id?: string
          id?: string
          name?: string
          notes?: string | null
          person_id?: string | null
          start_month?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_items_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_items_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      saving_goals: {
        Row: {
          created_at: string
          current_amount: number
          due_date: string | null
          household_id: string
          id: string
          name: string
          priority: number | null
          target_amount: number
        }
        Insert: {
          created_at?: string
          current_amount?: number
          due_date?: string | null
          household_id: string
          id?: string
          name: string
          priority?: number | null
          target_amount: number
        }
        Update: {
          created_at?: string
          current_amount?: number
          due_date?: string | null
          household_id?: string
          id?: string
          name?: string
          priority?: number | null
          target_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "saving_goals_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      savings_buckets: {
        Row: {
          created_at: string
          end_month: string
          household_id: string
          id: string
          monthly_planned: number
          name: string
          notes: string | null
          start_month: string
          target_amount: number
        }
        Insert: {
          created_at?: string
          end_month: string
          household_id: string
          id?: string
          monthly_planned?: number
          name: string
          notes?: string | null
          start_month: string
          target_amount?: number
        }
        Update: {
          created_at?: string
          end_month?: string
          household_id?: string
          id?: string
          monthly_planned?: number
          name?: string
          notes?: string | null
          start_month?: string
          target_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "savings_buckets_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency: string
          date: string
          guest_session_id: string | null
          household_id: string
          id: string
          name: string
          note: string | null
          person_id: string | null
          type: string
          user_id: string | null
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date: string
          guest_session_id?: string | null
          household_id: string
          id?: string
          name?: string
          note?: string | null
          person_id?: string | null
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency?: string
          date?: string
          guest_session_id?: string | null
          household_id?: string
          id?: string
          name?: string
          note?: string | null
          person_id?: string | null
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { p_token: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
