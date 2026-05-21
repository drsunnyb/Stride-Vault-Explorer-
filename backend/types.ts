/* eslint-disable */
// AUTO-GENERATED — DO NOT EDIT
// Run migrations to regenerate.

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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_config: {
        Row: {
          key: string
          updated_at: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: Json
        }
        Relationships: []
      }
      brands: {
        Row: {
          active: boolean | null
          coin_name: string
          color: string
          color_bright: string
          color_dim: string
          daily_cap: number | null
          exchange_rate: number | null
          id: string
          inverted_text: boolean | null
          mark: string | null
          name: string
          short: string
          sort_order: number | null
          tagline: string | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          coin_name: string
          color: string
          color_bright: string
          color_dim: string
          daily_cap?: number | null
          exchange_rate?: number | null
          id: string
          inverted_text?: boolean | null
          mark?: string | null
          name: string
          short: string
          sort_order?: number | null
          tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          coin_name?: string
          color?: string
          color_bright?: string
          color_dim?: string
          daily_cap?: number | null
          exchange_rate?: number | null
          id?: string
          inverted_text?: boolean | null
          mark?: string | null
          name?: string
          short?: string
          sort_order?: number | null
          tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          active: boolean | null
          country: string
          country_code: string
          id: string
          lat: number
          lng: number
          name: string
          radius_km: number
          sort_order: number | null
          status: string
          tagline: string | null
          updated_at: string | null
          votes: number | null
        }
        Insert: {
          active?: boolean | null
          country: string
          country_code: string
          id: string
          lat: number
          lng: number
          name: string
          radius_km?: number
          sort_order?: number | null
          status?: string
          tagline?: string | null
          updated_at?: string | null
          votes?: number | null
        }
        Update: {
          active?: boolean | null
          country?: string
          country_code?: string
          id?: string
          lat?: number
          lng?: number
          name?: string
          radius_km?: number
          sort_order?: number | null
          status?: string
          tagline?: string | null
          updated_at?: string | null
          votes?: number | null
        }
        Relationships: []
      }
      city_votes: {
        Row: {
          city_id: string
          updated_at: string | null
          user_id: string
          votes: number
        }
        Insert: {
          city_id: string
          updated_at?: string | null
          user_id: string
          votes?: number
        }
        Update: {
          city_id?: string
          updated_at?: string | null
          user_id?: string
          votes?: number
        }
        Relationships: [
          {
            foreignKeyName: "city_votes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_votes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "public_city_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_id: string | null
          coins: number | null
          created_at: string | null
          display_name: string | null
          handle: string | null
          home_city_id: string | null
          is_plus: boolean | null
          level: number | null
          referral_code: string | null
          referred_by: string | null
          streak_days: number | null
          total_steps: number | null
          tribe_id: string | null
          updated_at: string | null
          user_id: string
          xp: number | null
        }
        Insert: {
          avatar_id?: string | null
          coins?: number | null
          created_at?: string | null
          display_name?: string | null
          handle?: string | null
          home_city_id?: string | null
          is_plus?: boolean | null
          level?: number | null
          referral_code?: string | null
          referred_by?: string | null
          streak_days?: number | null
          total_steps?: number | null
          tribe_id?: string | null
          updated_at?: string | null
          user_id: string
          xp?: number | null
        }
        Update: {
          avatar_id?: string | null
          coins?: number | null
          created_at?: string | null
          display_name?: string | null
          handle?: string | null
          home_city_id?: string | null
          is_plus?: boolean | null
          level?: number | null
          referral_code?: string | null
          referred_by?: string | null
          streak_days?: number | null
          total_steps?: number | null
          tribe_id?: string | null
          updated_at?: string | null
          user_id?: string
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_home_city_id_fkey"
            columns: ["home_city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_home_city_id_fkey"
            columns: ["home_city_id"]
            isOneToOne: false
            referencedRelation: "public_city_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      raffle_entries: {
        Row: {
          entered_at: string | null
          entries: number
          id: string
          raffle_id: string
          user_id: string
        }
        Insert: {
          entered_at?: string | null
          entries?: number
          id?: string
          raffle_id: string
          user_id: string
        }
        Update: {
          entered_at?: string | null
          entries?: number
          id?: string
          raffle_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raffle_entries_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          active: boolean | null
          brand: string | null
          brand_entry_cost: number | null
          emoji: string | null
          ends_at: string
          entry_cost: number
          id: string
          max_entries_per_user: number | null
          plus_only: boolean | null
          prize: string
          prize_value_gbp: number | null
          sort_order: number | null
          title: string
          total_entries: number | null
          updated_at: string | null
          winners: number | null
        }
        Insert: {
          active?: boolean | null
          brand?: string | null
          brand_entry_cost?: number | null
          emoji?: string | null
          ends_at: string
          entry_cost: number
          id: string
          max_entries_per_user?: number | null
          plus_only?: boolean | null
          prize: string
          prize_value_gbp?: number | null
          sort_order?: number | null
          title: string
          total_entries?: number | null
          updated_at?: string | null
          winners?: number | null
        }
        Update: {
          active?: boolean | null
          brand?: string | null
          brand_entry_cost?: number | null
          emoji?: string | null
          ends_at?: string
          entry_cost?: number
          id?: string
          max_entries_per_user?: number | null
          plus_only?: boolean | null
          prize?: string
          prize_value_gbp?: number | null
          sort_order?: number | null
          title?: string
          total_entries?: number | null
          updated_at?: string | null
          winners?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "raffles_brand_fkey"
            columns: ["brand"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      redemptions: {
        Row: {
          brand: string | null
          brand_cost: number | null
          claimed_at: string | null
          code: string
          coin_cost: number | null
          expires_at: string | null
          id: string
          reward_id: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          brand_cost?: number | null
          claimed_at?: string | null
          code: string
          coin_cost?: number | null
          expires_at?: string | null
          id?: string
          reward_id: string
          user_id: string
        }
        Update: {
          brand?: string | null
          brand_cost?: number | null
          claimed_at?: string | null
          code?: string
          coin_cost?: number | null
          expires_at?: string | null
          id?: string
          reward_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          city_id: string | null
          created_at: string | null
          id: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
        }
        Insert: {
          city_id?: string | null
          created_at?: string | null
          id?: string
          referral_code: string
          referred_user_id: string
          referrer_user_id: string
        }
        Update: {
          city_id?: string | null
          created_at?: string | null
          id?: string
          referral_code?: string
          referred_user_id?: string
          referrer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "public_city_leaderboard"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          active: boolean | null
          badge: string | null
          brand: string | null
          brand_cost: number | null
          coin_cost: number | null
          emoji: string | null
          id: string
          in_store_only: boolean | null
          redeem_at: string | null
          sort_order: number | null
          subtitle: string | null
          title: string
          updated_at: string | null
          value_gbp: number | null
        }
        Insert: {
          active?: boolean | null
          badge?: string | null
          brand?: string | null
          brand_cost?: number | null
          coin_cost?: number | null
          emoji?: string | null
          id: string
          in_store_only?: boolean | null
          redeem_at?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title: string
          updated_at?: string | null
          value_gbp?: number | null
        }
        Update: {
          active?: boolean | null
          badge?: string | null
          brand?: string | null
          brand_cost?: number | null
          coin_cost?: number | null
          emoji?: string | null
          id?: string
          in_store_only?: boolean | null
          redeem_at?: string | null
          sort_order?: number | null
          subtitle?: string | null
          title?: string
          updated_at?: string | null
          value_gbp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rewards_brand_fkey"
            columns: ["brand"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_city_leaderboard: {
        Row: {
          country: string | null
          country_code: string | null
          id: string | null
          name: string | null
          sort_order: number | null
          status: string | null
          tagline: string | null
          votes: number | null
        }
        Insert: {
          country?: string | null
          country_code?: string | null
          id?: string | null
          name?: string | null
          sort_order?: number | null
          status?: string | null
          tagline?: string | null
          votes?: number | null
        }
        Update: {
          country?: string | null
          country_code?: string | null
          id?: string | null
          name?: string | null
          sort_order?: number | null
          status?: string | null
          tagline?: string | null
          votes?: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      user_id: { Args: never; Returns: string }
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
  public: {
    Enums: {},
  },
} as const
