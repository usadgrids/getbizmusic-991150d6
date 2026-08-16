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
      activation_codes: {
        Row: {
          ad_id: string | null
          ad_type: string
          agreed_at: string | null
          agreed_terms: boolean
          artwork_choice: string
          business_address: string | null
          business_name: string
          chosen_image: string
          city_id: string | null
          code: string
          confirmed_correct: boolean | null
          contact_email: string | null
          contact_name: string | null
          correction_notes: string | null
          created_at: string
          created_by: string | null
          customer_business_address: string | null
          customer_business_name: string | null
          customer_email: string | null
          customer_image_path: string | null
          customer_phone_sms: string | null
          customer_phone_voice: string | null
          due_at: string | null
          expires_at: string | null
          id: string
          image_path: string
          industry: string
          invoice_number: string | null
          memo_code: string | null
          paid_at: string | null
          payment_method: string | null
          phone_sms: string | null
          phone_voice: string | null
          price_cents: number
          price_note: string | null
          status: string
          stripe_session_id: string | null
          submitted_at: string | null
          tagline: string | null
          updated_at: string
          upload_token: string
          viewed_at: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_type?: string
          agreed_at?: string | null
          agreed_terms?: boolean
          artwork_choice?: string
          business_address?: string | null
          business_name: string
          chosen_image?: string
          city_id?: string | null
          code: string
          confirmed_correct?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          correction_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_business_address?: string | null
          customer_business_name?: string | null
          customer_email?: string | null
          customer_image_path?: string | null
          customer_phone_sms?: string | null
          customer_phone_voice?: string | null
          due_at?: string | null
          expires_at?: string | null
          id?: string
          image_path: string
          industry: string
          invoice_number?: string | null
          memo_code?: string | null
          paid_at?: string | null
          payment_method?: string | null
          phone_sms?: string | null
          phone_voice?: string | null
          price_cents?: number
          price_note?: string | null
          status?: string
          stripe_session_id?: string | null
          submitted_at?: string | null
          tagline?: string | null
          updated_at?: string
          upload_token?: string
          viewed_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_type?: string
          agreed_at?: string | null
          agreed_terms?: boolean
          artwork_choice?: string
          business_address?: string | null
          business_name?: string
          chosen_image?: string
          city_id?: string | null
          code?: string
          confirmed_correct?: boolean | null
          contact_email?: string | null
          contact_name?: string | null
          correction_notes?: string | null
          created_at?: string
          created_by?: string | null
          customer_business_address?: string | null
          customer_business_name?: string | null
          customer_email?: string | null
          customer_image_path?: string | null
          customer_phone_sms?: string | null
          customer_phone_voice?: string | null
          due_at?: string | null
          expires_at?: string | null
          id?: string
          image_path?: string
          industry?: string
          invoice_number?: string | null
          memo_code?: string | null
          paid_at?: string | null
          payment_method?: string | null
          phone_sms?: string | null
          phone_voice?: string | null
          price_cents?: number
          price_note?: string | null
          status?: string
          stripe_session_id?: string | null
          submitted_at?: string | null
          tagline?: string | null
          updated_at?: string
          upload_token?: string
          viewed_at?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activation_codes_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activation_codes_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_payments: {
        Row: {
          agreed_at: string | null
          agreed_no_refund: boolean
          agreed_terms: boolean
          amount_cents: number
          business_name: string | null
          city_id: string | null
          commission_cents: number
          commission_percent: number | null
          created_at: string
          customer_email: string
          design_addon: boolean
          disclosure_version: string | null
          discount_cents: number
          environment: string
          id: string
          ip_address: string | null
          owner_name: string | null
          paid_at: string | null
          payment_method: string
          phone: string | null
          plan: string
          rep_code: string | null
          rep_id: string | null
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
          business_name?: string | null
          city_id?: string | null
          commission_cents?: number
          commission_percent?: number | null
          created_at?: string
          customer_email: string
          design_addon?: boolean
          disclosure_version?: string | null
          discount_cents?: number
          environment?: string
          id?: string
          ip_address?: string | null
          owner_name?: string | null
          paid_at?: string | null
          payment_method?: string
          phone?: string | null
          plan: string
          rep_code?: string | null
          rep_id?: string | null
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
          business_name?: string | null
          city_id?: string | null
          commission_cents?: number
          commission_percent?: number | null
          created_at?: string
          customer_email?: string
          design_addon?: boolean
          disclosure_version?: string | null
          discount_cents?: number
          environment?: string
          id?: string
          ip_address?: string | null
          owner_name?: string | null
          paid_at?: string | null
          payment_method?: string
          phone?: string | null
          plan?: string
          rep_code?: string | null
          rep_id?: string | null
          status?: string
          stripe_session_id?: string
          submission_token?: string
          token_used?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ad_payments_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_payments_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "ad_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_reps: {
        Row: {
          active: boolean
          code: string
          commission_percent: number
          created_at: string
          created_by: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          commission_percent?: number
          created_at?: string
          created_by?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ad_submissions: {
        Row: {
          ad_id: string | null
          ad_type: string
          business_name: string
          city_id: string | null
          contact_name: string
          created_at: string
          email: string
          id: string
          image_path: string
          industry: string
          ministry_info: Json | null
          payment_id: string | null
          phone: string
          reject_reason: string | null
          requested_city_name: string | null
          requested_state_code: string | null
          status: string
          tagline: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          ad_id?: string | null
          ad_type: string
          business_name: string
          city_id?: string | null
          contact_name: string
          created_at?: string
          email: string
          id?: string
          image_path: string
          industry: string
          ministry_info?: Json | null
          payment_id?: string | null
          phone: string
          reject_reason?: string | null
          requested_city_name?: string | null
          requested_state_code?: string | null
          status?: string
          tagline?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          ad_id?: string | null
          ad_type?: string
          business_name?: string
          city_id?: string | null
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          image_path?: string
          industry?: string
          ministry_info?: Json | null
          payment_id?: string | null
          phone?: string
          reject_reason?: string | null
          requested_city_name?: string | null
          requested_state_code?: string | null
          status?: string
          tagline?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_submissions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_submissions_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
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
          city_id: string | null
          created_at: string
          duration_seconds: number
          edit_token: string
          expires_at: string
          id: string
          image_url: string
          industry: string
          ministry_info: Json | null
          starts_at: string
          status: string
          submission_id: string | null
          tagline: string | null
          website_url: string | null
          winwincast_synced_at: string | null
          youtube_url: string | null
        }
        Insert: {
          ad_number?: number
          ad_type: string
          business_name: string
          city_id?: string | null
          created_at?: string
          duration_seconds: number
          edit_token?: string
          expires_at: string
          id?: string
          image_url: string
          industry: string
          ministry_info?: Json | null
          starts_at?: string
          status?: string
          submission_id?: string | null
          tagline?: string | null
          website_url?: string | null
          winwincast_synced_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          ad_number?: number
          ad_type?: string
          business_name?: string
          city_id?: string | null
          created_at?: string
          duration_seconds?: number
          edit_token?: string
          expires_at?: string
          id?: string
          image_url?: string
          industry?: string
          ministry_info?: Json | null
          starts_at?: string
          status?: string
          submission_id?: string | null
          tagline?: string | null
          website_url?: string | null
          winwincast_synced_at?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ad_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_claims: {
        Row: {
          address: string | null
          alliance_member: boolean
          alliance_membership_date: string | null
          business_category: string | null
          business_name: string
          created_at: string
          founding_member: boolean
          google_place_id: string | null
          id: string
          launch_code_used: string | null
          locked_price: number | null
          notes: string | null
          owner_email: string
          owner_name: string
          owner_phone: string | null
          phone: string | null
          priority: boolean
          source_category_page: string | null
          status: string
          submitted_at: string
          updated_at: string
          wants_ad_design: boolean
          wants_ai_audit: boolean
          website: string | null
        }
        Insert: {
          address?: string | null
          alliance_member?: boolean
          alliance_membership_date?: string | null
          business_category?: string | null
          business_name: string
          created_at?: string
          founding_member?: boolean
          google_place_id?: string | null
          id?: string
          launch_code_used?: string | null
          locked_price?: number | null
          notes?: string | null
          owner_email: string
          owner_name: string
          owner_phone?: string | null
          phone?: string | null
          priority?: boolean
          source_category_page?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          wants_ad_design?: boolean
          wants_ai_audit?: boolean
          website?: string | null
        }
        Update: {
          address?: string | null
          alliance_member?: boolean
          alliance_membership_date?: string | null
          business_category?: string | null
          business_name?: string
          created_at?: string
          founding_member?: boolean
          google_place_id?: string | null
          id?: string
          launch_code_used?: string | null
          locked_price?: number | null
          notes?: string | null
          owner_email?: string
          owner_name?: string
          owner_phone?: string | null
          phone?: string | null
          priority?: boolean
          source_category_page?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          wants_ad_design?: boolean
          wants_ai_audit?: boolean
          website?: string | null
        }
        Relationships: []
      }
      cities: {
        Row: {
          created_at: string
          hero_background_url: string | null
          hero_tagline: string | null
          id: string
          is_active: boolean
          lat: number | null
          lng: number | null
          name: string
          slug: string
          sort_order: number
          state: string
          timezone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          hero_background_url?: string | null
          hero_tagline?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          slug: string
          sort_order?: number
          state: string
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          hero_background_url?: string | null
          hero_tagline?: string | null
          id?: string
          is_active?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          slug?: string
          sort_order?: number
          state?: string
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      city_requests: {
        Row: {
          city_name: string
          created_at: string
          email: string | null
          id: string
          message: string | null
          state: string | null
          status: string
          zip: string | null
        }
        Insert: {
          city_name: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          state?: string | null
          status?: string
          zip?: string | null
        }
        Update: {
          city_name?: string
          created_at?: string
          email?: string | null
          id?: string
          message?: string | null
          state?: string | null
          status?: string
          zip?: string | null
        }
        Relationships: []
      }
      design_orders: {
        Row: {
          ad_payment_id: string | null
          agreed_at: string | null
          agreed_no_refund: boolean
          agreed_terms: boolean
          amount_cents: number
          completed_at: string | null
          created_at: string
          customer_email: string
          disclosure_version: string | null
          environment: string
          id: string
          intake: Json | null
          intake_submitted_at: string | null
          ip_address: string | null
          paid_at: string | null
          source: string
          status: string
          stripe_session_id: string
          updated_at: string
        }
        Insert: {
          ad_payment_id?: string | null
          agreed_at?: string | null
          agreed_no_refund?: boolean
          agreed_terms?: boolean
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          customer_email: string
          disclosure_version?: string | null
          environment: string
          id?: string
          intake?: Json | null
          intake_submitted_at?: string | null
          ip_address?: string | null
          paid_at?: string | null
          source?: string
          status?: string
          stripe_session_id: string
          updated_at?: string
        }
        Update: {
          ad_payment_id?: string | null
          agreed_at?: string | null
          agreed_no_refund?: boolean
          agreed_terms?: boolean
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          disclosure_version?: string | null
          environment?: string
          id?: string
          intake?: Json | null
          intake_submitted_at?: string | null
          ip_address?: string | null
          paid_at?: string | null
          source?: string
          status?: string
          stripe_session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_orders_ad_payment_id_fkey"
            columns: ["ad_payment_id"]
            isOneToOne: false
            referencedRelation: "ad_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_topic_pages: {
        Row: {
          answer: string
          category: string
          created_at: string
          faqs: Json
          id: string
          question: string
          topic_label: string
          topic_slug: string
          updated_at: string
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          faqs?: Json
          id?: string
          question: string
          topic_label: string
          topic_slug: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          faqs?: Json
          id?: string
          question?: string
          topic_label?: string
          topic_slug?: string
          updated_at?: string
        }
        Relationships: []
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
          provider_message_id: string | null
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
          provider_message_id?: string | null
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
          provider_message_id?: string | null
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
      food_crawl_runs: {
        Row: {
          category: string
          created_at: string
          errors: string | null
          finished_at: string | null
          id: string
          place_id: string | null
          started_at: string
          status: string
          triggered_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          errors?: string | null
          finished_at?: string | null
          id?: string
          place_id?: string | null
          started_at?: string
          status?: string
          triggered_by: string
        }
        Update: {
          category?: string
          created_at?: string
          errors?: string | null
          finished_at?: string | null
          id?: string
          place_id?: string | null
          started_at?: string
          status?: string
          triggered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_crawl_runs_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "food_places"
            referencedColumns: ["id"]
          },
        ]
      }
      food_place_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          place_id: string
          question: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          place_id: string
          question: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          place_id?: string
          question?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_place_faqs_place_id_fkey"
            columns: ["place_id"]
            isOneToOne: false
            referencedRelation: "food_places"
            referencedColumns: ["id"]
          },
        ]
      }
      food_places: {
        Row: {
          ad_id: string
          address: string | null
          attributes: Json
          booking_url: string | null
          category: string
          city: string | null
          created_at: string
          cuisines: string[]
          description: string | null
          hours: Json
          id: string
          image_url: string | null
          last_crawled_at: string | null
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          price_range: string | null
          rating: number | null
          review_count: number | null
          slug: string
          source_urls: string[]
          state: string | null
          status: string
          summary: string | null
          updated_at: string
          website: string | null
          zip: string | null
        }
        Insert: {
          ad_id: string
          address?: string | null
          attributes?: Json
          booking_url?: string | null
          category?: string
          city?: string | null
          created_at?: string
          cuisines?: string[]
          description?: string | null
          hours?: Json
          id?: string
          image_url?: string | null
          last_crawled_at?: string | null
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          review_count?: number | null
          slug: string
          source_urls?: string[]
          state?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Update: {
          ad_id?: string
          address?: string | null
          attributes?: Json
          booking_url?: string | null
          category?: string
          city?: string | null
          created_at?: string
          cuisines?: string[]
          description?: string | null
          hours?: Json
          id?: string
          image_url?: string | null
          last_crawled_at?: string | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          price_range?: string | null
          rating?: number | null
          review_count?: number | null
          slug?: string
          source_urls?: string[]
          state?: string | null
          status?: string
          summary?: string | null
          updated_at?: string
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_places_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          locked_price: number
          redemption_count: number
          redemption_limit: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          locked_price?: number
          redemption_count?: number
          redemption_limit?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          locked_price?: number
          redemption_count?: number
          redemption_limit?: number
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          business_name: string | null
          campaign_status: string
          city: string | null
          click_count: number
          created_at: string
          delivered_at: string | null
          email: string
          first_opened_at: string | null
          founded_year: number | null
          id: string
          industry: string | null
          industry_category: string | null
          last_event_at: string | null
          last_opened_at: string | null
          open_count: number
          owner_name: string | null
          resend_message_id: string | null
          sent_at: string | null
          source: string
          source_detail: string | null
          state: string
          unsubscribe_token: string | null
          unsubscribed_at: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string | null
          campaign_status?: string
          city?: string | null
          click_count?: number
          created_at?: string
          delivered_at?: string | null
          email: string
          first_opened_at?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          industry_category?: string | null
          last_event_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          owner_name?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          source?: string
          source_detail?: string | null
          state?: string
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string | null
          campaign_status?: string
          city?: string | null
          click_count?: number
          created_at?: string
          delivered_at?: string | null
          email?: string
          first_opened_at?: string | null
          founded_year?: number | null
          id?: string
          industry?: string | null
          industry_category?: string | null
          last_event_at?: string | null
          last_opened_at?: string | null
          open_count?: number
          owner_name?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          source?: string
          source_detail?: string | null
          state?: string
          unsubscribe_token?: string | null
          unsubscribed_at?: string | null
          updated_at?: string
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
      redeem_launch_code: {
        Args: { _code: string }
        Returns: {
          applied: boolean
          locked_price: number
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
