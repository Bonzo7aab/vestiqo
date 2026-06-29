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
      admin_action_logs: {
        Row: {
          action_type: string
          actor_id: string
          created_at: string
          entity_id: string | null
          entity_table: string | null
          id: string
          payload: Json | null
        }
        Insert: {
          action_type: string
          actor_id: string
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          payload?: Json | null
        }
        Update: {
          action_type?: string
          actor_id?: string
          created_at?: string
          entity_id?: string | null
          entity_table?: string | null
          id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_action_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_user_notes: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          subject_user_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          subject_user_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_notes_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      application_attachments: {
        Row: {
          application_id: string
          attachment_type: string
          created_at: string | null
          file_size: number
          file_url: string
          id: string
          name: string
        }
        Insert: {
          application_id: string
          attachment_type: string
          created_at?: string | null
          file_size: number
          file_url: string
          id?: string
          name: string
        }
        Update: {
          application_id?: string
          attachment_type?: string
          created_at?: string | null
          file_size?: number
          file_url?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_attachments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      bookmarks: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["bookmark_entity_type"]
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["bookmark_entity_type"]
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["bookmark_entity_type"]
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_bookmarks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      managed_housing_entities: {
        Row: {
          address: string | null
          bank_account_iban: string | null
          city: string | null
          created_at: string
          entity_type: string
          id: string
          manager_company_id: string
          name: string
          nip: string
          postal_code: string | null
          regon: string | null
          updated_at: string
          vat_status: string | null
        }
        Insert: {
          address?: string | null
          bank_account_iban?: string | null
          city?: string | null
          created_at?: string
          entity_type: string
          id?: string
          manager_company_id: string
          name: string
          nip: string
          postal_code?: string | null
          regon?: string | null
          updated_at?: string
          vat_status?: string | null
        }
        Update: {
          address?: string | null
          bank_account_iban?: string | null
          city?: string | null
          created_at?: string
          entity_type?: string
          id?: string
          manager_company_id?: string
          name?: string
          nip?: string
          postal_code?: string | null
          regon?: string | null
          updated_at?: string
          vat_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "managed_housing_entities_manager_company_id_fkey"
            columns: ["manager_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      certificates: {
        Row: {
          company_id: string
          created_at: string | null
          description: string | null
          expiry_date: string | null
          file_url: string | null
          id: string
          is_verified: boolean | null
          issue_date: string | null
          issuer: string | null
          name: string
          number: string | null
          type: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          company_id: string
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          issuer?: string | null
          name: string
          number?: string | null
          type: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string | null
          description?: string | null
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          is_verified?: boolean | null
          issue_date?: string | null
          issuer?: string | null
          name?: string
          number?: string | null
          type?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          employee_count: string | null
          experience_data: Json | null
          founded_year: number | null
          id: string
          insurance_data: Json | null
          is_public: boolean | null
          is_verified: boolean | null
          krs: string | null
          last_active: string | null
          license_number: string | null
          logo_url: string | null
          manager_data: Json | null
          metadata: Json | null
          name: string
          nip: string | null
          phone: string | null
          plan_type: string | null
          portfolio_data: Json | null
          postal_code: string | null
          profile_data: Json | null
          regon: string | null
          short_name: string | null
          stats_data: Json | null
          type: string
          updated_at: string | null
          verification_level: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          employee_count?: string | null
          experience_data?: Json | null
          founded_year?: number | null
          id?: string
          insurance_data?: Json | null
          is_public?: boolean | null
          is_verified?: boolean | null
          krs?: string | null
          last_active?: string | null
          license_number?: string | null
          logo_url?: string | null
          manager_data?: Json | null
          metadata?: Json | null
          name: string
          nip?: string | null
          phone?: string | null
          plan_type?: string | null
          portfolio_data?: Json | null
          postal_code?: string | null
          profile_data?: Json | null
          regon?: string | null
          short_name?: string | null
          stats_data?: Json | null
          type: string
          updated_at?: string | null
          verification_level?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          employee_count?: string | null
          experience_data?: Json | null
          founded_year?: number | null
          id?: string
          insurance_data?: Json | null
          is_public?: boolean | null
          is_verified?: boolean | null
          krs?: string | null
          last_active?: string | null
          license_number?: string | null
          logo_url?: string | null
          manager_data?: Json | null
          metadata?: Json | null
          name?: string
          nip?: string | null
          phone?: string | null
          plan_type?: string | null
          portfolio_data?: Json | null
          postal_code?: string | null
          profile_data?: Json | null
          regon?: string | null
          short_name?: string | null
          stats_data?: Json | null
          type?: string
          updated_at?: string | null
          verification_level?: string | null
          website?: string | null
        }
        Relationships: []
      }
      company_ratings: {
        Row: {
          average_rating: number | null
          category_ratings: Json | null
          company_id: string
          last_review_date: string | null
          rating_breakdown: Json | null
          total_reviews: number | null
          updated_at: string | null
        }
        Insert: {
          average_rating?: number | null
          category_ratings?: Json | null
          company_id: string
          last_review_date?: string | null
          rating_breakdown?: Json | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Update: {
          average_rating?: number | null
          category_ratings?: Json | null
          company_id?: string
          last_review_date?: string | null
          rating_breakdown?: Json | null
          total_reviews?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_ratings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_reviews: {
        Row: {
          categories: Json | null
          comment: string | null
          company_id: string
          contest_id: string | null
          created_at: string | null
          id: string
          image_urls: string[]
          is_public: boolean | null
          is_verified: boolean | null
          job_id: string | null
          rating: number
          reviewer_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          categories?: Json | null
          comment?: string | null
          company_id: string
          contest_id?: string | null
          created_at?: string | null
          id?: string
          image_urls?: string[]
          is_public?: boolean | null
          is_verified?: boolean | null
          job_id?: string | null
          rating: number
          reviewer_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          categories?: Json | null
          comment?: string | null
          company_id?: string
          contest_id?: string | null
          created_at?: string | null
          id?: string
          image_urls?: string[]
          is_public?: boolean | null
          is_verified?: boolean | null
          job_id?: string | null
          rating?: number
          reviewer_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_reviews_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "budget_data_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_reviews_tender_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_offers: {
        Row: {
          admin_feedback_message: string | null
          admin_moderated_at: string | null
          admin_moderated_by: string | null
          admin_moderation_status: string
          attachments: Json | null
          bid_amount: number
          certificates: string[] | null
          company_id: string
          contest_id: string
          contractor_id: string
          currency: string | null
          evaluated_at: string | null
          evaluation_notes: string | null
          evaluation_score: number | null
          experience_summary: string | null
          financial_proposal: string | null
          id: string
          manager_feedback_message: string | null
          offer_details: Json | null
          project_references: string[] | null
          proposed_start_date: string | null
          proposed_timeline: number | null
          status: string | null
          submitted_at: string | null
          team_description: string | null
          technical_proposal: string | null
          valid_until: string | null
        }
        Insert: {
          admin_feedback_message?: string | null
          admin_moderated_at?: string | null
          admin_moderated_by?: string | null
          admin_moderation_status?: string
          attachments?: Json | null
          bid_amount: number
          certificates?: string[] | null
          company_id: string
          contest_id: string
          contractor_id: string
          currency?: string | null
          evaluated_at?: string | null
          evaluation_notes?: string | null
          evaluation_score?: number | null
          experience_summary?: string | null
          financial_proposal?: string | null
          id?: string
          manager_feedback_message?: string | null
          offer_details?: Json | null
          project_references?: string[] | null
          proposed_start_date?: string | null
          proposed_timeline?: number | null
          status?: string | null
          submitted_at?: string | null
          team_description?: string | null
          technical_proposal?: string | null
          valid_until?: string | null
        }
        Update: {
          admin_feedback_message?: string | null
          admin_moderated_at?: string | null
          admin_moderated_by?: string | null
          admin_moderation_status?: string
          attachments?: Json | null
          bid_amount?: number
          certificates?: string[] | null
          company_id?: string
          contest_id?: string
          contractor_id?: string
          currency?: string | null
          evaluated_at?: string | null
          evaluation_notes?: string | null
          evaluation_score?: number | null
          experience_summary?: string | null
          financial_proposal?: string | null
          id?: string
          manager_feedback_message?: string | null
          offer_details?: Json | null
          project_references?: string[] | null
          proposed_start_date?: string | null
          proposed_timeline?: number | null
          status?: string | null
          submitted_at?: string | null
          team_description?: string | null
          technical_proposal?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_bids_admin_moderated_by_fkey"
            columns: ["admin_moderated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bids_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bids_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_bids_tender_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          address: string | null
          allow_questions: boolean | null
          awarded_at: string | null
          managed_entity_id: string | null
          category_id: string
          company_id: string
          completion_date: string | null
          created_at: string | null
          currency: string | null
          current_phase: string | null
          deposit_instructions: string | null
          deposit_required: boolean | null
          description: string
          documents: Json | null
          estimated_value: number
          evaluation_criteria: Json | null
          evaluation_deadline: string | null
          formal_requirements: Json | null
          guarantee_period: string | null
          id: string
          is_public: boolean | null
          latitude: number | null
          location: Json
          longitude: number | null
          manager_id: string
          offers_count: number | null
          payment_terms: Json | null
          phases: Json | null
          project_duration: string | null
          published_at: string | null
          requirements: string[] | null
          selection_criteria: Json | null
          selection_justification: string | null
          site_visit_notes: string | null
          site_visit_type: string | null
          status: string | null
          subcategory_id: string | null
          submission_deadline: string
          title: string
          updated_at: string | null
          views_count: number | null
          wadium: number | null
          warranty_period: string | null
          winner_name: string | null
          winning_offer_id: string | null
        }
        Insert: {
          address?: string | null
          allow_questions?: boolean | null
          awarded_at?: string | null
          managed_entity_id?: string | null
          category_id: string
          company_id: string
          completion_date?: string | null
          created_at?: string | null
          currency?: string | null
          current_phase?: string | null
          deposit_instructions?: string | null
          deposit_required?: boolean | null
          description: string
          documents?: Json | null
          estimated_value: number
          evaluation_criteria?: Json | null
          evaluation_deadline?: string | null
          formal_requirements?: Json | null
          guarantee_period?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          location: Json
          longitude?: number | null
          manager_id: string
          offers_count?: number | null
          payment_terms?: Json | null
          phases?: Json | null
          project_duration?: string | null
          published_at?: string | null
          requirements?: string[] | null
          selection_criteria?: Json | null
          selection_justification?: string | null
          site_visit_notes?: string | null
          site_visit_type?: string | null
          status?: string | null
          subcategory_id?: string | null
          submission_deadline: string
          title: string
          updated_at?: string | null
          views_count?: number | null
          wadium?: number | null
          warranty_period?: string | null
          winner_name?: string | null
          winning_offer_id?: string | null
        }
        Update: {
          address?: string | null
          allow_questions?: boolean | null
          awarded_at?: string | null
          managed_entity_id?: string | null
          category_id?: string
          company_id?: string
          completion_date?: string | null
          created_at?: string | null
          currency?: string | null
          current_phase?: string | null
          deposit_instructions?: string | null
          deposit_required?: boolean | null
          description?: string
          documents?: Json | null
          estimated_value?: number
          evaluation_criteria?: Json | null
          evaluation_deadline?: string | null
          formal_requirements?: Json | null
          guarantee_period?: string | null
          id?: string
          is_public?: boolean | null
          latitude?: number | null
          location?: Json
          longitude?: number | null
          manager_id?: string
          offers_count?: number | null
          payment_terms?: Json | null
          phases?: Json | null
          project_duration?: string | null
          published_at?: string | null
          requirements?: string[] | null
          selection_criteria?: Json | null
          selection_justification?: string | null
          site_visit_notes?: string | null
          site_visit_type?: string | null
          status?: string | null
          subcategory_id?: string | null
          submission_deadline?: string
          title?: string
          updated_at?: string | null
          views_count?: number | null
          wadium?: number | null
          warranty_period?: string | null
          winner_name?: string | null
          winning_offer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contests_managed_entity_id_fkey"
            columns: ["managed_entity_id"]
            isOneToOne: false
            referencedRelation: "managed_housing_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenders_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      contractor_account_settings: {
        Row: {
          bank_account_iban: string | null
          created_at: string | null
          id: string
          notification_channels: Json
          oc_guarantee_amount: number | null
          oc_policy_scan_path: string | null
          oc_valid_until: string | null
          professional_qualification_types: Json
          professional_qualifications_scan_path: string | null
          professional_qualifications_valid_until: string | null
          radar_settings: Json
          reference_document_paths: Json
          service_area_settings: Json
          tax_certificate_issued_at: string | null
          tax_certificate_path: string | null
          updated_at: string | null
          user_id: string
          vat_status: string | null
          zus_certificate_issued_at: string | null
          zus_certificate_path: string | null
        }
        Insert: {
          bank_account_iban?: string | null
          created_at?: string | null
          id?: string
          notification_channels?: Json
          oc_guarantee_amount?: number | null
          oc_policy_scan_path?: string | null
          oc_valid_until?: string | null
          professional_qualification_types?: Json
          professional_qualifications_scan_path?: string | null
          professional_qualifications_valid_until?: string | null
          radar_settings?: Json
          reference_document_paths?: Json
          service_area_settings?: Json
          tax_certificate_issued_at?: string | null
          tax_certificate_path?: string | null
          updated_at?: string | null
          user_id: string
          vat_status?: string | null
          zus_certificate_issued_at?: string | null
          zus_certificate_path?: string | null
        }
        Update: {
          bank_account_iban?: string | null
          created_at?: string | null
          id?: string
          notification_channels?: Json
          oc_guarantee_amount?: number | null
          oc_policy_scan_path?: string | null
          oc_valid_until?: string | null
          professional_qualification_types?: Json
          professional_qualifications_scan_path?: string | null
          professional_qualifications_valid_until?: string | null
          radar_settings?: Json
          reference_document_paths?: Json
          service_area_settings?: Json
          tax_certificate_issued_at?: string | null
          tax_certificate_path?: string | null
          updated_at?: string | null
          user_id?: string
          vat_status?: string | null
          zus_certificate_issued_at?: string | null
          zus_certificate_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contractor_account_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          application_id: string | null
          contest_id: string | null
          contest_offer_id: string | null
          created_at: string | null
          id: string
          is_archived: boolean | null
          job_id: string | null
          job_title: string | null
          last_message_at: string | null
          last_message_content: string | null
          last_message_sender_id: string | null
          last_message_sender_name: string | null
          last_message_timestamp: string | null
          participant_1: string
          participant_2: string
          subject: string | null
          unread_count: number | null
          updated_at: string | null
        }
        Insert: {
          application_id?: string | null
          contest_id?: string | null
          contest_offer_id?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          job_id?: string | null
          job_title?: string | null
          last_message_at?: string | null
          last_message_content?: string | null
          last_message_sender_id?: string | null
          last_message_sender_name?: string | null
          last_message_timestamp?: string | null
          participant_1: string
          participant_2: string
          subject?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Update: {
          application_id?: string | null
          contest_id?: string | null
          contest_offer_id?: string | null
          created_at?: string | null
          id?: string
          is_archived?: boolean | null
          job_id?: string | null
          job_title?: string | null
          last_message_at?: string | null
          last_message_content?: string | null
          last_message_sender_id?: string | null
          last_message_sender_name?: string | null
          last_message_timestamp?: string | null
          participant_1?: string
          participant_2?: string
          subject?: string | null
          unread_count?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_bid_id_fkey"
            columns: ["contest_offer_id"]
            isOneToOne: false
            referencedRelation: "contest_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "budget_data_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_last_message_sender_id_fkey"
            columns: ["last_message_sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_tender_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_criteria: {
        Row: {
          created_at: string | null
          criteria_type: string
          description: string | null
          id: string
          name: string
          sort_order: number | null
          tender_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          criteria_type: string
          description?: string | null
          id?: string
          name: string
          sort_order?: number | null
          tender_id: string
          weight: number
        }
        Update: {
          created_at?: string | null
          criteria_type?: string
          description?: string | null
          id?: string
          name?: string
          sort_order?: number | null
          tender_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_criteria_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      file_uploads: {
        Row: {
          alt_text: string | null
          created_at: string | null
          description: string | null
          download_count: number | null
          entity_id: string | null
          entity_type: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          is_public: boolean | null
          metadata: Json | null
          mime_type: string
          original_name: string
          updated_at: string | null
          user_id: string
          virus_scan_result: Json | null
          virus_scan_status: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          entity_id?: string | null
          entity_type?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type: string
          original_name: string
          updated_at?: string | null
          user_id: string
          virus_scan_result?: Json | null
          virus_scan_status?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          entity_id?: string | null
          entity_type?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          is_public?: boolean | null
          metadata?: Json | null
          mime_type?: string
          original_name?: string
          updated_at?: string | null
          user_id?: string
          virus_scan_result?: Json | null
          virus_scan_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_uploads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          admin_feedback_message: string | null
          admin_moderated_at: string | null
          admin_moderated_by: string | null
          admin_moderation_status: string
          attachments: Json | null
          available_from: string | null
          certificates: string[] | null
          company_id: string
          contractor_avatar: string | null
          contractor_company: string | null
          contractor_completed_jobs: number | null
          contractor_id: string
          contractor_location: string | null
          contractor_name: string | null
          contractor_rating: number | null
          cover_letter: string | null
          currency: string | null
          decision_at: string | null
          experience: string | null
          guarantee_period: number | null
          id: string
          job_id: string
          last_updated: string | null
          manager_feedback_message: string | null
          notes: string | null
          proposed_price: number | null
          proposed_start_date: string | null
          proposed_timeline: number | null
          review_notes: string | null
          reviewed_at: string | null
          status: string | null
          submitted_at: string | null
          team_size: number | null
          vat_rate: number
        }
        Insert: {
          admin_feedback_message?: string | null
          admin_moderated_at?: string | null
          admin_moderated_by?: string | null
          admin_moderation_status?: string
          attachments?: Json | null
          available_from?: string | null
          certificates?: string[] | null
          company_id: string
          contractor_avatar?: string | null
          contractor_company?: string | null
          contractor_completed_jobs?: number | null
          contractor_id: string
          contractor_location?: string | null
          contractor_name?: string | null
          contractor_rating?: number | null
          cover_letter?: string | null
          currency?: string | null
          decision_at?: string | null
          experience?: string | null
          guarantee_period?: number | null
          id?: string
          job_id: string
          last_updated?: string | null
          manager_feedback_message?: string | null
          notes?: string | null
          proposed_price?: number | null
          proposed_start_date?: string | null
          proposed_timeline?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string | null
          submitted_at?: string | null
          team_size?: number | null
          vat_rate?: number
        }
        Update: {
          admin_feedback_message?: string | null
          admin_moderated_at?: string | null
          admin_moderated_by?: string | null
          admin_moderation_status?: string
          attachments?: Json | null
          available_from?: string | null
          certificates?: string[] | null
          company_id?: string
          contractor_avatar?: string | null
          contractor_company?: string | null
          contractor_completed_jobs?: number | null
          contractor_id?: string
          contractor_location?: string | null
          contractor_name?: string | null
          contractor_rating?: number | null
          cover_letter?: string | null
          currency?: string | null
          decision_at?: string | null
          experience?: string | null
          guarantee_period?: number | null
          id?: string
          job_id?: string
          last_updated?: string | null
          manager_feedback_message?: string | null
          notes?: string | null
          proposed_price?: number | null
          proposed_start_date?: string | null
          proposed_timeline?: number | null
          review_notes?: string | null
          reviewed_at?: string | null
          status?: string | null
          submitted_at?: string | null
          team_size?: number | null
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_admin_moderated_by_fkey"
            columns: ["admin_moderated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "budget_data_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          additional_info: string | null
          address: string | null
          applications_count: number | null
          bookmarks_count: number | null
          budget_max: number | null
          budget_min: number | null
          budget_type: string | null
          managed_entity_id: string | null
          building_type: string | null
          building_year: number | null
          category_id: string
          certificates: string[] | null
          client_type: string | null
          company_id: string
          company_logo: string | null
          completed_jobs: number | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          contract_type: string | null
          created_at: string | null
          currency: string | null
          deadline: string | null
          description: string
          expires_at: string | null
          has_insurance: boolean | null
          id: string
          images: string[] | null
          is_premium: boolean | null
          is_public: boolean | null
          latitude: number | null
          location: Json
          longitude: number | null
          manager_id: string
          payment_terms: string | null
          post_type: string | null
          project_duration: string | null
          published_at: string | null
          rating: number | null
          requirements: string[] | null
          responsibilities: string[] | null
          salary: string | null
          skills_required: string[] | null
          status: string | null
          subcategory_id: string | null
          sublocality_level_1: string | null
          surface_area: string | null
          tender_info: Json | null
          termination_conditions: string | null
          title: string
          type: string | null
          updated_at: string | null
          urgency: string | null
          urgent: boolean | null
          verified: boolean | null
          views_count: number | null
          warranty_period: string | null
        }
        Insert: {
          additional_info?: string | null
          address?: string | null
          applications_count?: number | null
          bookmarks_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: string | null
          managed_entity_id?: string | null
          building_type?: string | null
          building_year?: number | null
          category_id: string
          certificates?: string[] | null
          client_type?: string | null
          company_id: string
          company_logo?: string | null
          completed_jobs?: number | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_type?: string | null
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description: string
          expires_at?: string | null
          has_insurance?: boolean | null
          id?: string
          images?: string[] | null
          is_premium?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location: Json
          longitude?: number | null
          manager_id: string
          payment_terms?: string | null
          post_type?: string | null
          project_duration?: string | null
          published_at?: string | null
          rating?: number | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary?: string | null
          skills_required?: string[] | null
          status?: string | null
          subcategory_id?: string | null
          sublocality_level_1?: string | null
          surface_area?: string | null
          tender_info?: Json | null
          termination_conditions?: string | null
          title: string
          type?: string | null
          updated_at?: string | null
          urgency?: string | null
          urgent?: boolean | null
          verified?: boolean | null
          views_count?: number | null
          warranty_period?: string | null
        }
        Update: {
          additional_info?: string | null
          address?: string | null
          applications_count?: number | null
          bookmarks_count?: number | null
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: string | null
          managed_entity_id?: string | null
          building_type?: string | null
          building_year?: number | null
          category_id?: string
          certificates?: string[] | null
          client_type?: string | null
          company_id?: string
          company_logo?: string | null
          completed_jobs?: number | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          contract_type?: string | null
          created_at?: string | null
          currency?: string | null
          deadline?: string | null
          description?: string
          expires_at?: string | null
          has_insurance?: boolean | null
          id?: string
          images?: string[] | null
          is_premium?: boolean | null
          is_public?: boolean | null
          latitude?: number | null
          location?: Json
          longitude?: number | null
          manager_id?: string
          payment_terms?: string | null
          post_type?: string | null
          project_duration?: string | null
          published_at?: string | null
          rating?: number | null
          requirements?: string[] | null
          responsibilities?: string[] | null
          salary?: string | null
          skills_required?: string[] | null
          status?: string | null
          subcategory_id?: string | null
          sublocality_level_1?: string | null
          surface_area?: string | null
          tender_info?: Json | null
          termination_conditions?: string | null
          title?: string
          type?: string | null
          updated_at?: string | null
          urgency?: string | null
          urgent?: boolean | null
          verified?: boolean | null
          views_count?: number | null
          warranty_period?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_managed_entity_id_fkey"
            columns: ["managed_entity_id"]
            isOneToOne: false
            referencedRelation: "managed_housing_entities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      message_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_read_status: {
        Row: {
          id: string
          message_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_read_status_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_read_status_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          conversation_id: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_edited: boolean | null
          is_read: boolean | null
          message_timestamp: string | null
          message_type: string | null
          read_at: string | null
          reply_to_id: string | null
          sender_avatar_url: string | null
          sender_id: string
          sender_name: string | null
        }
        Insert: {
          attachments?: Json | null
          content: string
          conversation_id: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_read?: boolean | null
          message_timestamp?: string | null
          message_type?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_avatar_url?: string | null
          sender_id: string
          sender_name?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string
          conversation_id?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_edited?: boolean | null
          is_read?: boolean | null
          message_timestamp?: string | null
          message_type?: string | null
          read_at?: string | null
          reply_to_id?: string | null
          sender_avatar_url?: string | null
          sender_id?: string
          sender_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          contractor_contest_answer_notifications: boolean | null
          contractor_contest_offer_accepted_notifications: boolean | null
          contractor_contest_offer_rejected_notifications: boolean | null
          contractor_contest_resolution_notifications: boolean | null
          created_at: string | null
          email_notifications: boolean | null
          id: string
          manager_contest_question_notifications: boolean | null
          marketing_notifications: boolean | null
          message_notifications: boolean | null
          new_contest_notifications: boolean | null
          new_job_notifications: boolean | null
          push_notifications: boolean | null
          reminder_notifications: boolean | null
          sms_notifications: boolean | null
          status_update_notifications: boolean | null
          system_notifications: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contractor_contest_answer_notifications?: boolean | null
          contractor_contest_offer_accepted_notifications?: boolean | null
          contractor_contest_offer_rejected_notifications?: boolean | null
          contractor_contest_resolution_notifications?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          manager_contest_question_notifications?: boolean | null
          marketing_notifications?: boolean | null
          message_notifications?: boolean | null
          new_contest_notifications?: boolean | null
          new_job_notifications?: boolean | null
          push_notifications?: boolean | null
          reminder_notifications?: boolean | null
          sms_notifications?: boolean | null
          status_update_notifications?: boolean | null
          system_notifications?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contractor_contest_answer_notifications?: boolean | null
          contractor_contest_offer_accepted_notifications?: boolean | null
          contractor_contest_offer_rejected_notifications?: boolean | null
          contractor_contest_resolution_notifications?: boolean | null
          created_at?: string | null
          email_notifications?: boolean | null
          id?: string
          manager_contest_question_notifications?: boolean | null
          marketing_notifications?: boolean | null
          message_notifications?: boolean | null
          new_contest_notifications?: boolean | null
          new_job_notifications?: boolean | null
          push_notifications?: boolean | null
          reminder_notifications?: boolean | null
          sms_notifications?: boolean | null
          status_update_notifications?: boolean | null
          system_notifications?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          is_read: boolean | null
          message: string
          notification_timestamp: string | null
          priority: string | null
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          notification_timestamp?: string | null
          priority?: string | null
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          notification_timestamp?: string | null
          priority?: string | null
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completion_deadline: string | null
          contest_id: string
          contest_offer_id: string
          contractor_company_id: string
          contractor_id: string
          created_at: string
          currency: string
          gross_amount: number
          id: string
          location_label: string | null
          manager_company_id: string
          manager_id: string
          net_amount: number
          reported_for_acceptance_at: string | null
          status: string
          title: string
          updated_at: string
          vat_rate: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completion_deadline?: string | null
          contest_id: string
          contest_offer_id: string
          contractor_company_id: string
          contractor_id: string
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          location_label?: string | null
          manager_company_id: string
          manager_id: string
          net_amount?: number
          reported_for_acceptance_at?: string | null
          status?: string
          title: string
          updated_at?: string
          vat_rate?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completion_deadline?: string | null
          contest_id?: string
          contest_offer_id?: string
          contractor_company_id?: string
          contractor_id?: string
          created_at?: string
          currency?: string
          gross_amount?: number
          id?: string
          location_label?: string | null
          manager_company_id?: string
          manager_id?: string
          net_amount?: number
          reported_for_acceptance_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          vat_rate?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contractor_company_id_fkey"
            columns: ["contractor_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_contractor_id_fkey"
            columns: ["contractor_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_manager_company_id_fkey"
            columns: ["manager_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tender_bid_id_fkey"
            columns: ["contest_offer_id"]
            isOneToOne: false
            referencedRelation: "contest_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tender_id_fkey"
            columns: ["contest_id"]
            isOneToOne: true
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          contractor_registration_enabled: boolean
          id: number
          manager_registration_enabled: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          contractor_registration_enabled?: boolean
          id?: number
          manager_registration_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          contractor_registration_enabled?: boolean
          id?: number
          manager_registration_enabled?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_project_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          description: string | null
          file_id: string
          id: string
          image_type: string | null
          project_id: string
          sort_order: number | null
          title: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          file_id: string
          id?: string
          image_type?: string | null
          project_id: string
          sort_order?: number | null
          title?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          file_id?: string
          id?: string
          image_type?: string | null
          project_id?: string
          sort_order?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_project_images_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "file_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_project_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "portfolio_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_projects: {
        Row: {
          budget_range: string | null
          category_id: string | null
          client_feedback: string | null
          client_name: string | null
          company_id: string
          completion_date: string | null
          created_at: string | null
          description: string | null
          duration: string | null
          id: string
          is_featured: boolean | null
          location: string | null
          project_type: string | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          budget_range?: string | null
          category_id?: string | null
          client_feedback?: string | null
          client_name?: string | null
          company_id: string
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          project_type?: string | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          budget_range?: string | null
          category_id?: string | null
          client_feedback?: string | null
          client_name?: string | null
          company_id?: string
          completion_date?: string | null
          created_at?: string | null
          description?: string | null
          duration?: string | null
          id?: string
          is_featured?: boolean | null
          location?: string | null
          project_type?: string | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_projects_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "job_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_projects_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      question_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          question_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          question_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_comments_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          asker_id: string
          contest_id: string | null
          created_at: string | null
          id: string
          is_public: boolean | null
          job_id: string | null
          manager_seen_at: string | null
          question: string
          updated_at: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asker_id: string
          contest_id?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          job_id?: string | null
          manager_seen_at?: string | null
          question: string
          updated_at?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          asker_id?: string
          contest_id?: string | null
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          job_id?: string | null
          manager_seen_at?: string | null
          question?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "budget_data_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_tender_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          author_company: string | null
          author_name: string
          author_type: string
          categories: Json | null
          comment: string | null
          created_at: string | null
          helpful_count: number | null
          id: string
          is_verified: boolean | null
          job_id: string | null
          project_budget: string | null
          project_name: string
          rating: number
          response: string | null
          review_date: string
          reviewee_id: string
          reviewer_id: string
          tender_id: string | null
          updated_at: string | null
        }
        Insert: {
          author_company?: string | null
          author_name: string
          author_type: string
          categories?: Json | null
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          job_id?: string | null
          project_budget?: string | null
          project_name: string
          rating: number
          response?: string | null
          review_date: string
          reviewee_id: string
          reviewer_id: string
          tender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          author_company?: string | null
          author_name?: string
          author_type?: string
          categories?: Json | null
          comment?: string | null
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          is_verified?: boolean | null
          job_id?: string | null
          project_budget?: string | null
          project_name?: string
          rating?: number
          response?: string | null
          review_date?: string
          reviewee_id?: string
          reviewer_id?: string
          tender_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "budget_data_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      tender_documents: {
        Row: {
          created_at: string | null
          document_type: string
          file_size: number
          file_url: string
          id: string
          name: string
          tender_id: string
          uploaded_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          document_type: string
          file_size: number
          file_url: string
          id?: string
          name: string
          tender_id: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          document_type?: string
          file_size?: number
          file_url?: string
          id?: string
          name?: string
          tender_id?: string
          uploaded_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_documents_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tender_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          id: string
          is_active: boolean | null
          is_primary: boolean | null
          joined_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          joined_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          is_active?: boolean | null
          is_primary?: boolean | null
          joined_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_companies_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_role: string | null
          ac_amount: string | null
          active_contractors: number | null
          availability_status: string | null
          avatar_url: string | null
          average_jobs_per_month: number | null
          average_project_budget: string | null
          average_project_duration: string | null
          average_response_time: string | null
          average_unit_size: number | null
          budget_accuracy: number | null
          budget_flexibility: string | null
          budget_preferences: string | null
          budget_range_max: number | null
          budget_range_min: number | null
          buildings_count: number | null
          certifications: string[] | null
          communication_rating: number | null
          communication_style: string | null
          company_type: string | null
          completed_projects: number | null
          construction_year_max: number | null
          construction_year_min: number | null
          contact_person: string | null
          contractor_retention_rate: number | null
          cover_image_url: string | null
          created_at: string | null
          district: string | null
          employee_count: string | null
          featured_projects: Json | null
          first_name: string
          frequent_services: string[] | null
          funding_sources: string[] | null
          has_ac: boolean | null
          has_oc: boolean | null
          hourly_rate_max: number | null
          hourly_rate_min: number | null
          id: string
          insurance_requirements: string | null
          insurance_valid_until: string | null
          is_verified: boolean | null
          krs: string | null
          last_active: string | null
          last_job_posted: string | null
          last_name: string
          last_verified: string | null
          legal_form: string | null
          managed_buildings: Json | null
          negotiable: boolean | null
          next_available: string | null
          nip: string | null
          oc_amount: string | null
          on_time_completion: number | null
          onboarding_completed: boolean | null
          organization_type: string | null
          overall_rating: number | null
          payment_punctuality: number | null
          payment_terms: string[] | null
          payment_timeliness_rating: number | null
          phone: string | null
          plan_type: string | null
          platform_role: 'user' | 'platform_admin'
          portfolio_images: string[] | null
          position: string | null
          preferred_contractor_size: string[] | null
          preferred_payment_methods: string[] | null
          pricing_rating: number | null
          primary_needs: string[] | null
          primary_services: string[] | null
          professionalism_rating: number | null
          profile_completed: boolean | null
          project_based: boolean | null
          project_clarity_rating: number | null
          project_completion_rate: number | null
          project_types: Json | null
          property_types: string[] | null
          published_jobs: number | null
          quality_rating: number | null
          regon: string | null
          rehire_rate: number | null
          required_certificates: string[] | null
          response_time: string | null
          reviews_count: number | null
          seasonal_activity: Json | null
          secondary_services: string[] | null
          service_area: string[] | null
          special_requests: string[] | null
          special_requirements: string[] | null
          specializations: string[] | null
          timeliness_rating: number | null
          total_area: number | null
          total_jobs_this_year: number | null
          units_count: number | null
          updated_at: string | null
          user_type: 'manager' | 'contractor'
          verification_badges: string[] | null
          verification_document_paths: Json
          verification_document_reviews: Json
          verification_documents: string[] | null
          verification_status: string | null
          verification_submitted_at: string | null
          website: string | null
          work_schedule_preference: string | null
          working_hours: string | null
          year_established: number | null
          years_active: number | null
          years_in_business: number | null
        }
        Insert: {
          account_role?: string | null
          ac_amount?: string | null
          active_contractors?: number | null
          availability_status?: string | null
          avatar_url?: string | null
          average_jobs_per_month?: number | null
          average_project_budget?: string | null
          average_project_duration?: string | null
          average_response_time?: string | null
          average_unit_size?: number | null
          budget_accuracy?: number | null
          budget_flexibility?: string | null
          budget_preferences?: string | null
          budget_range_max?: number | null
          budget_range_min?: number | null
          buildings_count?: number | null
          certifications?: string[] | null
          communication_rating?: number | null
          communication_style?: string | null
          company_type?: string | null
          completed_projects?: number | null
          construction_year_max?: number | null
          construction_year_min?: number | null
          contact_person?: string | null
          contractor_retention_rate?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          district?: string | null
          employee_count?: string | null
          featured_projects?: Json | null
          first_name: string
          frequent_services?: string[] | null
          funding_sources?: string[] | null
          has_ac?: boolean | null
          has_oc?: boolean | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id: string
          insurance_requirements?: string | null
          insurance_valid_until?: string | null
          is_verified?: boolean | null
          krs?: string | null
          last_active?: string | null
          last_job_posted?: string | null
          last_name: string
          last_verified?: string | null
          legal_form?: string | null
          managed_buildings?: Json | null
          negotiable?: boolean | null
          next_available?: string | null
          nip?: string | null
          oc_amount?: string | null
          on_time_completion?: number | null
          onboarding_completed?: boolean | null
          organization_type?: string | null
          overall_rating?: number | null
          payment_punctuality?: number | null
          payment_terms?: string[] | null
          payment_timeliness_rating?: number | null
          phone?: string | null
          plan_type?: string | null
          platform_role?: 'user' | 'platform_admin'
          portfolio_images?: string[] | null
          position?: string | null
          preferred_contractor_size?: string[] | null
          preferred_payment_methods?: string[] | null
          pricing_rating?: number | null
          primary_needs?: string[] | null
          primary_services?: string[] | null
          professionalism_rating?: number | null
          profile_completed?: boolean | null
          project_based?: boolean | null
          project_clarity_rating?: number | null
          project_completion_rate?: number | null
          project_types?: Json | null
          property_types?: string[] | null
          published_jobs?: number | null
          quality_rating?: number | null
          regon?: string | null
          rehire_rate?: number | null
          required_certificates?: string[] | null
          response_time?: string | null
          reviews_count?: number | null
          seasonal_activity?: Json | null
          secondary_services?: string[] | null
          service_area?: string[] | null
          special_requests?: string[] | null
          special_requirements?: string[] | null
          specializations?: string[] | null
          timeliness_rating?: number | null
          total_area?: number | null
          total_jobs_this_year?: number | null
          units_count?: number | null
          updated_at?: string | null
          user_type: 'manager' | 'contractor'
          verification_badges?: string[] | null
          verification_document_paths?: Json
          verification_document_reviews?: Json
          verification_documents?: string[] | null
          verification_status?: string | null
          verification_submitted_at?: string | null
          website?: string | null
          work_schedule_preference?: string | null
          working_hours?: string | null
          year_established?: number | null
          years_active?: number | null
          years_in_business?: number | null
        }
        Update: {
          account_role?: string | null
          ac_amount?: string | null
          active_contractors?: number | null
          availability_status?: string | null
          avatar_url?: string | null
          average_jobs_per_month?: number | null
          average_project_budget?: string | null
          average_project_duration?: string | null
          average_response_time?: string | null
          average_unit_size?: number | null
          budget_accuracy?: number | null
          budget_flexibility?: string | null
          budget_preferences?: string | null
          budget_range_max?: number | null
          budget_range_min?: number | null
          buildings_count?: number | null
          certifications?: string[] | null
          communication_rating?: number | null
          communication_style?: string | null
          company_type?: string | null
          completed_projects?: number | null
          construction_year_max?: number | null
          construction_year_min?: number | null
          contact_person?: string | null
          contractor_retention_rate?: number | null
          cover_image_url?: string | null
          created_at?: string | null
          district?: string | null
          employee_count?: string | null
          featured_projects?: Json | null
          first_name?: string
          frequent_services?: string[] | null
          funding_sources?: string[] | null
          has_ac?: boolean | null
          has_oc?: boolean | null
          hourly_rate_max?: number | null
          hourly_rate_min?: number | null
          id?: string
          insurance_requirements?: string | null
          insurance_valid_until?: string | null
          is_verified?: boolean | null
          krs?: string | null
          last_active?: string | null
          last_job_posted?: string | null
          last_name?: string
          last_verified?: string | null
          legal_form?: string | null
          managed_buildings?: Json | null
          negotiable?: boolean | null
          next_available?: string | null
          nip?: string | null
          oc_amount?: string | null
          on_time_completion?: number | null
          onboarding_completed?: boolean | null
          organization_type?: string | null
          overall_rating?: number | null
          payment_punctuality?: number | null
          payment_terms?: string[] | null
          payment_timeliness_rating?: number | null
          phone?: string | null
          plan_type?: string | null
          platform_role?: 'user' | 'platform_admin'
          portfolio_images?: string[] | null
          position?: string | null
          preferred_contractor_size?: string[] | null
          preferred_payment_methods?: string[] | null
          pricing_rating?: number | null
          primary_needs?: string[] | null
          primary_services?: string[] | null
          professionalism_rating?: number | null
          profile_completed?: boolean | null
          project_based?: boolean | null
          project_clarity_rating?: number | null
          project_completion_rate?: number | null
          project_types?: Json | null
          property_types?: string[] | null
          published_jobs?: number | null
          quality_rating?: number | null
          regon?: string | null
          rehire_rate?: number | null
          required_certificates?: string[] | null
          response_time?: string | null
          reviews_count?: number | null
          seasonal_activity?: Json | null
          secondary_services?: string[] | null
          service_area?: string[] | null
          special_requests?: string[] | null
          special_requirements?: string[] | null
          specializations?: string[] | null
          timeliness_rating?: number | null
          total_area?: number | null
          total_jobs_this_year?: number | null
          units_count?: number | null
          updated_at?: string | null
          user_type?: 'manager' | 'contractor'
          verification_badges?: string[] | null
          verification_document_paths?: Json
          verification_document_reviews?: Json
          verification_documents?: string[] | null
          verification_status?: string | null
          verification_submitted_at?: string | null
          website?: string | null
          work_schedule_preference?: string | null
          working_hours?: string | null
          year_established?: number | null
          years_active?: number | null
          years_in_business?: number | null
        }
        Relationships: []
      }
      verification_decisions: {
        Row: {
          company_id: string | null
          created_at: string
          decided_by: string
          decision: string
          id: string
          reason: string | null
          subject_user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          decided_by: string
          decision: string
          id?: string
          reason?: string | null
          subject_user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          decided_by?: string
          decision?: string
          id?: string
          reason?: string | null
          subject_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_decisions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_decisions_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_decisions_subject_user_id_fkey"
            columns: ["subject_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      budget_data_view: {
        Row: {
          budget: Json | null
          budget_display: string | null
          budget_max: number | null
          budget_min: number | null
          budget_type: string | null
          created_at: string | null
          currency: string | null
          id: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          budget?: never
          budget_display?: never
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          budget?: never
          budget_display?: never
          budget_max?: number | null
          budget_min?: number | null
          budget_type?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      add_contest_question_comment: {
        Args: { p_body: string; p_question_id: string }
        Returns: string
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      advance_contests_past_submission_deadline: {
        Args: never
        Returns: number
      }
      answer_contest_question: {
        Args: { p_answer: string; p_question_id: string }
        Returns: string
      }
      count_unseen_contest_questions: {
        Args: { p_contest_ids: string[] }
        Returns: {
          contest_id: string
          unseen_count: number
        }[]
      }
      delete_contest_question_comment: {
        Args: { p_comment_id: string }
        Returns: undefined
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      is_admin: { Args: never; Returns: boolean }
      list_contest_questions_contractor: {
        Args: { p_contest_id: string }
        Returns: {
          answered_at: string
          comments: Json
          created_at: string
          id: string
          question: string
        }[]
      }
      list_contest_questions_manager: {
        Args: { p_contest_id: string }
        Returns: {
          answered_at: string
          asker_display_name: string
          asker_id: string
          comments: Json
          company_name: string
          created_at: string
          id: string
          question: string
        }[]
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_contest_questions_seen: {
        Args: { p_contest_id: string }
        Returns: number
      }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_expired_jobs_to_inactive: { Args: never; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      user_can_manage_contest: {
        Args: { p_contest_id: string }
        Returns: boolean
      }
      user_owns_or_manages_company: {
        Args: { company_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      bookmark_entity_type: "job" | "contest"
      notification_type:
        | "new_job"
        | "new_tender"
        | "application_received"
        | "bid_received"
        | "application_status_update"
        | "bid_status_update"
        | "job_assigned"
        | "tender_awarded"
        | "new_message"
        | "review_received"
        | "certificate_expiring"
        | "deadline_reminder"
        | "system_announcement"
        | "subscription_expiring"
        | "payment_failed"
        | "verification_approved"
        | "verification_rejected"
        | "profile_completion_reminder"
        | "info"
        | "success"
        | "warning"
        | "error"
        | "application"
        | "tender"
        | "message"
        | "offer_admin_moderation"
        | "listing_admin_paused"
        | "contest_question"
        | "new_contest"
        | "contest_awarded"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      bookmark_entity_type: ["job", "contest"],
      notification_type: [
        "new_job",
        "new_tender",
        "application_received",
        "bid_received",
        "application_status_update",
        "bid_status_update",
        "job_assigned",
        "tender_awarded",
        "new_message",
        "review_received",
        "certificate_expiring",
        "deadline_reminder",
        "system_announcement",
        "subscription_expiring",
        "payment_failed",
        "verification_approved",
        "verification_rejected",
        "profile_completion_reminder",
        "info",
        "success",
        "warning",
        "error",
        "application",
        "tender",
        "message",
        "offer_admin_moderation",
        "listing_admin_paused",
        "contest_question",
        "new_contest",
        "contest_awarded",
      ],
    },
  },
} as const
