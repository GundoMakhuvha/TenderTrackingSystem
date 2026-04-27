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
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          tender_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          tender_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          tender_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tender_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          requirement_type: string
          tender_id: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          requirement_type: string
          tender_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          requirement_type?: string
          tender_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tender_attachments_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_requirements: {
        Row: {
          accreditation_required: boolean
          accreditation_status: string
          created_at: string
          cvs_required: boolean
          cvs_status: string
          id: string
          jv_required: boolean
          jv_status: string
          pricing_finalised: boolean
          project_plans_required: boolean
          project_plans_status: string
          quote_required: boolean
          quote_status: string
          reference_letters_required: boolean
          reference_letters_status: string
          technical_response_status: string
          tender_id: string
          updated_at: string
        }
        Insert: {
          accreditation_required?: boolean
          accreditation_status?: string
          created_at?: string
          cvs_required?: boolean
          cvs_status?: string
          id?: string
          jv_required?: boolean
          jv_status?: string
          pricing_finalised?: boolean
          project_plans_required?: boolean
          project_plans_status?: string
          quote_required?: boolean
          quote_status?: string
          reference_letters_required?: boolean
          reference_letters_status?: string
          technical_response_status?: string
          tender_id: string
          updated_at?: string
        }
        Update: {
          accreditation_required?: boolean
          accreditation_status?: string
          created_at?: string
          cvs_required?: boolean
          cvs_status?: string
          id?: string
          jv_required?: boolean
          jv_status?: string
          pricing_finalised?: boolean
          project_plans_required?: boolean
          project_plans_status?: string
          quote_required?: boolean
          quote_status?: string
          reference_letters_required?: boolean
          reference_letters_status?: string
          technical_response_status?: string
          tender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_requirements_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: true
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tender_team_members: {
        Row: {
          created_at: string
          id: string
          tender_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tender_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tender_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tender_team_members_tender_id_fkey"
            columns: ["tender_id"]
            isOneToOne: false
            referencedRelation: "tenders"
            referencedColumns: ["id"]
          },
        ]
      }
      tenders: {
        Row: {
          assigned_lead_email: string
          assigned_lead_name: string
          assignment: string | null
          briefing_attended: boolean | null
          briefing_compulsory: boolean | null
          briefing_date: string | null
          briefing_time: string | null
          budget: number | null
          category: string | null
          client_name: string
          created_at: string
          created_by: string | null
          department: string | null
          duration_months: number | null
          estimated_value: number | null
          id: string
          internal_completion_date: string | null
          non_submission_reason: string | null
          outcome_status: string | null
          rating: string | null
          status: Database["public"]["Enums"]["tender_status"]
          submission_deadline: string
          submission_type: string | null
          submitted: boolean | null
          successful: boolean | null
          tender_reference: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assigned_lead_email: string
          assigned_lead_name: string
          assignment?: string | null
          briefing_attended?: boolean | null
          briefing_compulsory?: boolean | null
          briefing_date?: string | null
          briefing_time?: string | null
          budget?: number | null
          category?: string | null
          client_name: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          duration_months?: number | null
          estimated_value?: number | null
          id?: string
          internal_completion_date?: string | null
          non_submission_reason?: string | null
          outcome_status?: string | null
          rating?: string | null
          status?: Database["public"]["Enums"]["tender_status"]
          submission_deadline: string
          submission_type?: string | null
          submitted?: boolean | null
          successful?: boolean | null
          tender_reference: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assigned_lead_email?: string
          assigned_lead_name?: string
          assignment?: string | null
          briefing_attended?: boolean | null
          briefing_compulsory?: boolean | null
          briefing_date?: string | null
          briefing_time?: string | null
          budget?: number | null
          category?: string | null
          client_name?: string
          created_at?: string
          created_by?: string | null
          department?: string | null
          duration_months?: number | null
          estimated_value?: number | null
          id?: string
          internal_completion_date?: string | null
          non_submission_reason?: string | null
          outcome_status?: string | null
          rating?: string | null
          status?: Database["public"]["Enums"]["tender_status"]
          submission_deadline?: string
          submission_type?: string | null
          submitted?: boolean | null
          successful?: boolean | null
          tender_reference?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
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
      can_manage_tender: {
        Args: { _tender_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_bids_team: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "bids_team" | "assigned_user"
      tender_status:
        | "drafting"
        | "review"
        | "submitted"
        | "new"
        | "go_ahead"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "rejected"
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
      app_role: ["admin", "bids_team", "assigned_user"],
      tender_status: [
        "drafting",
        "review",
        "submitted",
        "new",
        "go_ahead",
        "in_progress",
        "completed",
        "cancelled",
        "rejected",
      ],
    },
  },
} as const
