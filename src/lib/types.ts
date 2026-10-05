import type { Database } from "@/lib/supabase/database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type MemberRole = Enums["member_role"];
export type Channel = Enums["channel"];
export type SubmissionStatus = Enums["submission_status"];
export type FindingStatus = Enums["finding_status"];
export type FindingSeverity = Enums["finding_severity"];
export type ReviewDecision = Enums["review_decision"];
export type RuleType = Enums["rule_type"];
export type CheckOutcome = Enums["check_outcome"];

export type Organization = Tables["organizations"]["Row"];
export type Profile = Tables["profiles"]["Row"];
export type Brand = Tables["brands"]["Row"];
export type Jurisdiction = Tables["jurisdictions"]["Row"];
export type Policy = Tables["policies"]["Row"];
export type PolicyRule = Tables["policy_rules"]["Row"];
export type Submission = Tables["submissions"]["Row"];
export type SubmissionVersion = Tables["submission_versions"]["Row"];
export type CreativeFile = Tables["creative_files"]["Row"];
export type CheckRun = Tables["check_runs"]["Row"];
export type Finding = Tables["findings"]["Row"];
export type Review = Tables["reviews"]["Row"];
export type ApprovalRecord = Tables["approval_records"]["Row"];
export type AuditEvent = Tables["audit_events"]["Row"];

/** Result returned by every server action that a form displays. */
export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
