
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "approval_records": {
                  Row: {
                    "approved_at": string,"approved_by": string,"id": string,"organization_id": string,"reference_code": string,"review_id": string,"snapshot": NonNullable<Json>,"submission_id": string,"version_id": string
                  }
                  Insert: {
                    "approved_at"?: string,"approved_by": string,"id"?: string,"organization_id": string,"reference_code": string,"review_id": string,"snapshot": NonNullable<Json>,"submission_id": string,"version_id": string
                  }
                  Update: {
                    "approved_at"?: string,"approved_by"?: string,"id"?: string,"organization_id"?: string,"reference_code"?: string,"review_id"?: string,"snapshot"?: NonNullable<Json>,"submission_id"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "approval_records_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_records_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_records_review_id_fkey"
      columns: ["review_id"]
isOneToOne: true
      referencedRelation: "reviews"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_records_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "approval_records_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "submission_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_events": {
                  Row: {
                    "action": string,"actor_email": string,"actor_id": string | null,"created_at": string,"description": string,"entity_id": string | null,"entity_type": string,"id": string,"metadata": NonNullable<Json>,"organization_id": string,"submission_id": string | null
                  }
                  Insert: {
                    "action": string,"actor_email"?: string,"actor_id"?: string | null,"created_at"?: string,"description"?: string,"entity_id"?: string | null,"entity_type": string,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id": string,"submission_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_email"?: string,"actor_id"?: string | null,"created_at"?: string,"description"?: string,"entity_id"?: string | null,"entity_type"?: string,"id"?: string,"metadata"?: NonNullable<Json>,"organization_id"?: string,"submission_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_events_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_events_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_events_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"brand_jurisdictions": {
                  Row: {
                    "brand_id": string,"jurisdiction_id": string,"organization_id": string
                  }
                  Insert: {
                    "brand_id": string,"jurisdiction_id": string,"organization_id": string
                  }
                  Update: {
                    "brand_id"?: string,"jurisdiction_id"?: string,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "brand_jurisdictions_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "brand_jurisdictions_jurisdiction_id_fkey"
      columns: ["jurisdiction_id"]
isOneToOne: false
      referencedRelation: "jurisdictions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "brand_jurisdictions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"brands": {
                  Row: {
                    "created_at": string,"description": string,"id": string,"internal_notes": string,"logo_path": string | null,"name": string,"organization_id": string,"status": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"description"?: string,"id"?: string,"internal_notes"?: string,"logo_path"?: string | null,"name": string,"organization_id": string,"status"?: string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"description"?: string,"id"?: string,"internal_notes"?: string,"logo_path"?: string | null,"name"?: string,"organization_id"?: string,"status"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "brands_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"check_runs": {
                  Row: {
                    "ai_provider": string,"created_at": string,"id": string,"organization_id": string,"outcome": Database["public"]['Enums']["check_outcome"],"pass_count": number,"policy_snapshot": NonNullable<Json>,"potential_issue_count": number,"review_required_count": number,"run_by": string,"submission_id": string,"summary": string,"version_id": string
                  }
                  Insert: {
                    "ai_provider"?: string,"created_at"?: string,"id"?: string,"organization_id": string,"outcome": Database["public"]['Enums']["check_outcome"],"pass_count"?: number,"policy_snapshot"?: NonNullable<Json>,"potential_issue_count"?: number,"review_required_count"?: number,"run_by": string,"submission_id": string,"summary": string,"version_id": string
                  }
                  Update: {
                    "ai_provider"?: string,"created_at"?: string,"id"?: string,"organization_id"?: string,"outcome"?: Database["public"]['Enums']["check_outcome"],"pass_count"?: number,"policy_snapshot"?: NonNullable<Json>,"potential_issue_count"?: number,"review_required_count"?: number,"run_by"?: string,"submission_id"?: string,"summary"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "check_runs_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "check_runs_run_by_fkey"
      columns: ["run_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "check_runs_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "check_runs_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "submission_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"creative_files": {
                  Row: {
                    "created_at": string,"created_by": string,"file_name": string,"id": string,"mime_type": string,"organization_id": string,"size_bytes": number,"storage_path": string,"submission_id": string,"version_id": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"file_name": string,"id"?: string,"mime_type": string,"organization_id": string,"size_bytes": number,"storage_path": string,"submission_id": string,"version_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"file_name"?: string,"id"?: string,"mime_type"?: string,"organization_id"?: string,"size_bytes"?: number,"storage_path"?: string,"submission_id"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "creative_files_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "creative_files_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "creative_files_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "creative_files_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "submission_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"findings": {
                  Row: {
                    "category": string,"check_run_id": string,"created_at": string,"evidence": string,"explanation": string,"id": string,"organization_id": string,"policy_id": string | null,"policy_version": number | null,"rule_id": string | null,"rule_reference": string,"severity": Database["public"]['Enums']["finding_severity"],"source": string,"status": Database["public"]['Enums']["finding_status"],"submission_id": string,"title": string,"version_id": string
                  }
                  Insert: {
                    "category": string,"check_run_id": string,"created_at"?: string,"evidence"?: string,"explanation": string,"id"?: string,"organization_id": string,"policy_id"?: string | null,"policy_version"?: number | null,"rule_id"?: string | null,"rule_reference"?: string,"severity": Database["public"]['Enums']["finding_severity"],"source": string,"status": Database["public"]['Enums']["finding_status"],"submission_id": string,"title": string,"version_id": string
                  }
                  Update: {
                    "category"?: string,"check_run_id"?: string,"created_at"?: string,"evidence"?: string,"explanation"?: string,"id"?: string,"organization_id"?: string,"policy_id"?: string | null,"policy_version"?: number | null,"rule_id"?: string | null,"rule_reference"?: string,"severity"?: Database["public"]['Enums']["finding_severity"],"source"?: string,"status"?: Database["public"]['Enums']["finding_status"],"submission_id"?: string,"title"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "findings_check_run_id_fkey"
      columns: ["check_run_id"]
isOneToOne: false
      referencedRelation: "check_runs"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_policy_id_fkey"
      columns: ["policy_id"]
isOneToOne: false
      referencedRelation: "policies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_rule_id_fkey"
      columns: ["rule_id"]
isOneToOne: false
      referencedRelation: "policy_rules"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "submission_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"jurisdictions": {
                  Row: {
                    "code": string,"created_at": string,"id": string,"is_active": boolean,"name": string,"organization_id": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name": string,"organization_id": string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"id"?: string,"is_active"?: boolean,"name"?: string,"organization_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "jurisdictions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"organization_members": {
                  Row: {
                    "created_at": string,"id": string,"organization_id": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"organization_id": string,"role": Database["public"]['Enums']["member_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"organization_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "organization_members_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "organization_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"slug": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"slug": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"slug"?: string
                  }
                  Relationships: [
                    
                  ]
                },"policies": {
                  Row: {
                    "brand_id": string | null,"created_at": string,"created_by": string | null,"description": string,"id": string,"is_demo": boolean,"jurisdiction_id": string | null,"name": string,"organization_id": string,"status": string,"updated_at": string,"version": number
                  }
                  Insert: {
                    "brand_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_demo"?: boolean,"jurisdiction_id"?: string | null,"name": string,"organization_id": string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "brand_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string,"id"?: string,"is_demo"?: boolean,"jurisdiction_id"?: string | null,"name"?: string,"organization_id"?: string,"status"?: string,"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "policies_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "policies_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "policies_jurisdiction_id_fkey"
      columns: ["jurisdiction_id"]
isOneToOne: false
      referencedRelation: "jurisdictions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "policies_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"policy_rules": {
                  Row: {
                    "category": string,"channels": (Database["public"]['Enums']["channel"])[],"code": string,"config": NonNullable<Json>,"created_at": string,"explanation": string,"id": string,"is_active": boolean,"organization_id": string,"policy_id": string,"rule_type": Database["public"]['Enums']["rule_type"],"severity": Database["public"]['Enums']["finding_severity"],"title": string,"updated_at": string
                  }
                  Insert: {
                    "category"?: string,"channels"?: (Database["public"]['Enums']["channel"])[],"code": string,"config"?: NonNullable<Json>,"created_at"?: string,"explanation"?: string,"id"?: string,"is_active"?: boolean,"organization_id": string,"policy_id": string,"rule_type": Database["public"]['Enums']["rule_type"],"severity"?: Database["public"]['Enums']["finding_severity"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "category"?: string,"channels"?: (Database["public"]['Enums']["channel"])[],"code"?: string,"config"?: NonNullable<Json>,"created_at"?: string,"explanation"?: string,"id"?: string,"is_active"?: boolean,"organization_id"?: string,"policy_id"?: string,"rule_type"?: Database["public"]['Enums']["rule_type"],"severity"?: Database["public"]['Enums']["finding_severity"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "policy_rules_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "policy_rules_policy_id_fkey"
      columns: ["policy_id"]
isOneToOne: false
      referencedRelation: "policies"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"email": string,"full_name": string,"id": string
                  }
                  Insert: {
                    "created_at"?: string,"email": string,"full_name"?: string,"id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string,"full_name"?: string,"id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reviews": {
                  Row: {
                    "comment": string,"created_at": string,"decision": Database["public"]['Enums']["review_decision"],"id": string,"organization_id": string,"reviewer_id": string,"submission_id": string,"version_id": string
                  }
                  Insert: {
                    "comment"?: string,"created_at"?: string,"decision": Database["public"]['Enums']["review_decision"],"id"?: string,"organization_id": string,"reviewer_id": string,"submission_id": string,"version_id": string
                  }
                  Update: {
                    "comment"?: string,"created_at"?: string,"decision"?: Database["public"]['Enums']["review_decision"],"id"?: string,"organization_id"?: string,"reviewer_id"?: string,"submission_id"?: string,"version_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_version_id_fkey"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "submission_versions"
      referencedColumns: ["id"]
    }
                  ]
                },"submission_versions": {
                  Row: {
                    "change_note": string,"created_at": string,"created_by": string,"creative_text": string,"destination_url": string | null,"id": string,"organization_id": string,"submission_id": string,"version_number": number
                  }
                  Insert: {
                    "change_note"?: string,"created_at"?: string,"created_by": string,"creative_text"?: string,"destination_url"?: string | null,"id"?: string,"organization_id": string,"submission_id": string,"version_number": number
                  }
                  Update: {
                    "change_note"?: string,"created_at"?: string,"created_by"?: string,"creative_text"?: string,"destination_url"?: string | null,"id"?: string,"organization_id"?: string,"submission_id"?: string,"version_number"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "submission_versions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_versions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submission_versions_submission_id_fkey"
      columns: ["submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "brand_id": string,"campaign_name": string,"channel": Database["public"]['Enums']["channel"],"created_at": string,"created_by": string,"current_version_id": string | null,"decided_at": string | null,"id": string,"internal_notes": string,"jurisdiction_id": string,"organization_id": string,"status": Database["public"]['Enums']["submission_status"],"submitted_at": string | null,"updated_at": string
                  }
                  Insert: {
                    "brand_id": string,"campaign_name": string,"channel": Database["public"]['Enums']["channel"],"created_at"?: string,"created_by": string,"current_version_id"?: string | null,"decided_at"?: string | null,"id"?: string,"internal_notes"?: string,"jurisdiction_id": string,"organization_id": string,"status"?: Database["public"]['Enums']["submission_status"],"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "brand_id"?: string,"campaign_name"?: string,"channel"?: Database["public"]['Enums']["channel"],"created_at"?: string,"created_by"?: string,"current_version_id"?: string | null,"decided_at"?: string | null,"id"?: string,"internal_notes"?: string,"jurisdiction_id"?: string,"organization_id"?: string,"status"?: Database["public"]['Enums']["submission_status"],"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_brand_id_fkey"
      columns: ["brand_id"]
isOneToOne: false
      referencedRelation: "brands"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_current_version_fk"
      columns: ["current_version_id"]
isOneToOne: false
      referencedRelation: "submission_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_jurisdiction_id_fkey"
      columns: ["jurisdiction_id"]
isOneToOne: false
      referencedRelation: "jurisdictions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "submissions_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            [_ in never]: never
          }
          Enums: {
            "channel": "social_media"|"display_advertising"|"email"|"sms"|"affiliate_creative"|"landing_page","check_outcome": "no_issue_detected"|"review_required"|"potential_issue","finding_severity": "low"|"medium"|"high","finding_status": "pass"|"potential_issue"|"review_required","member_role": "admin"|"marketing"|"compliance","review_decision": "approved"|"changes_requested"|"rejected"|"comment","rule_type": "required_phrase"|"prohibited_phrase"|"required_disclaimer"|"required_terms_reference"|"destination_url_required"|"required_brand_text","submission_status": "draft"|"checked"|"pending_review"|"changes_requested"|"approved"|"rejected"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "channel": ["social_media", "display_advertising", "email", "sms", "affiliate_creative", "landing_page"],"check_outcome": ["no_issue_detected", "review_required", "potential_issue"],"finding_severity": ["low", "medium", "high"],"finding_status": ["pass", "potential_issue", "review_required"],"member_role": ["admin", "marketing", "compliance"],"review_decision": ["approved", "changes_requested", "rejected", "comment"],"rule_type": ["required_phrase", "prohibited_phrase", "required_disclaimer", "required_terms_reference", "destination_url_required", "required_brand_text"],"submission_status": ["draft", "checked", "pending_review", "changes_requested", "approved", "rejected"]
          }
        }
} as const
