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
      ad_payments: {
        Row: {
          agreed_at: string | null
          agreed_no_refund: boolean
          agreed_terms: boolean
          amount_cents: number
          created_at: string
          customer_email: string
          disclosure_version: string | null
          environment: string
          id: string
          ip_address: string | null
          paid_at: string | null
          plan: string
          status: string
          stripe_session_id: string
          submission_token: string
          token_used: boolean
        }
        Insert: {
          agreed_at?: string | null
          agreed_no_refund?: boolean
          agreed_terms?: boolean
          amount_cents: number
          created_at?: string
          customer_email: string
          disclosure_version?: string | null
          environment?: string
          id?: string
          ip_address?: string | null
          paid_at?: string | null
          plan: string
          status?: string
          stripe_session_id: string
          submission_token?: string
          token_used?: boolean
        }
        Update: {
          agreed_at?: string | null
          agreed_no_refund?: boolean
          agreed_terms?: boolean
          amount_cents?: number
          created_at?: string
          customer_email?: string
          disclosure_version?: string | null
          environment?: string
          id?: string
          ip_address?: string | null
          paid_at?: string | null
          plan?: string
          status?: string
          stripe_session_id?: string
          submission_token?: string
          token_used?: boolean
        }
        Relationships: []
      }
      ad_submissions: {
        Row: {
          ad_type: string
          business_name: string
          contact_name: string
          created_at: string
          email: string
          id: string
          image_path: string
          industry: string
          payment_id: string | null
          phone: string
          reject_reason: string | null
          status: string
          tagline: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          ad_type: string
          business_name: string
          contact_name: string
          created_at?: string
          email: string
          id?: string
          image_path: string
          industry: string
          payment_id?: string | null
          phone: string
          reject_reason?: string | null
          status?: string
          tagline?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          ad_type?: string
          business_name?: string
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          image_path?: string
          industry?: string
          payment_id?: string | null
          phone?: string
          reject_reason?: string | null
          status?: string
          tagline?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_submissions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "ad_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          ad_number: number
          ad_type: string
          business_name: string
          created_at: string
          duration_seconds: number
          expires_at: string
          id: string
          image_url: string
          industry: string
          starts_at: string
          status: string
          submission_id: string | null
          tagline: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          ad_number?: number
          ad_type: string
          business_name: string
          created_at?: string
          duration_seconds: number
          expires_at: string
          id?: string
          image_url: string
          industry: string
          starts_at?: string
          status?: string
          submission_id?: string | null
          tagline?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          ad_number?: number
          ad_type?: string
          business_name?: string
          created_at?: string
          duration_seconds?: number
          expires_at?: string
          id?: string
          image_url?: string
          industry?: string
          starts_at?: string
          status?: string
          submission_id?: string | null
          tagline?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ad_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_evidence_log: {
        Row: {
          ad_payment_id: string | null
          amount_cents: number | null
          charge_id: string | null
          created_at: string
          currency: string | null
          dispute_id: string
          environment: string
          evidence_json: Json | null
          evidence_text: string
          id: string
          payment_intent_id: string | null
          reason: string | null
          status: string
          stripe_session_id: string | null
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          ad_payment_id?: string | null
          amount_cents?: number | null
          charge_id?: string | null
          created_at?: string
          currency?: string | null
          dispute_id: string
          environment?: string
          evidence_json?: Json | null
          evidence_text?: string
          id?: string
          payment_intent_id?: string | null
          reason?: string | null
          status?: string
          stripe_session_id?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          ad_payment_id?: string | null
          amount_cents?: number | null
          charge_id?: string | null
          created_at?: string
          currency?: string | null
          dispute_id?: string
          environment?: string
          evidence_json?: Json | null
          evidence_text?: string
          id?: string
          payment_intent_id?: string | null
          reason?: string | null
          status?: string
          stripe_session_id?: string | null
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dispute_evidence_log_ad_payment_id_fkey"
            columns: ["ad_payment_id"]
            isOneToOne: false
            referencedRelation: "ad_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin"
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
      app_role: ["admin"],
    },
  },
} as const
