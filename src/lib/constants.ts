import type {
  Channel,
  CheckOutcome,
  FindingSeverity,
  FindingStatus,
  MemberRole,
  ReviewDecision,
  RuleType,
  SubmissionStatus,
} from "@/lib/types";

export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: "Admin",
  marketing: "Marketing",
  compliance: "Compliance Reviewer",
};

export const CHANNELS: Channel[] = [
  "social_media",
  "display_advertising",
  "email",
  "sms",
  "affiliate_creative",
  "landing_page",
];

export const CHANNEL_LABELS: Record<Channel, string> = {
  social_media: "Social Media",
  display_advertising: "Display Advertising",
  email: "Email",
  sms: "SMS",
  affiliate_creative: "Affiliate Creative",
  landing_page: "Landing Page",
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  draft: "Draft",
  checked: "Checked",
  pending_review: "Pending Review",
  changes_requested: "Changes Requested",
  approved: "Approved",
  rejected: "Rejected",
};

export const FINDING_STATUS_LABELS: Record<FindingStatus, string> = {
  pass: "Pass",
  potential_issue: "Potential Issue",
  review_required: "Review Required",
};

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const DECISION_LABELS: Record<ReviewDecision, string> = {
  approved: "Approved",
  changes_requested: "Changes Requested",
  rejected: "Rejected",
  comment: "Comment",
};

export const RULE_TYPE_LABELS: Record<RuleType, string> = {
  required_phrase: "Required phrase",
  prohibited_phrase: "Prohibited phrase",
  required_disclaimer: "Required disclaimer",
  required_terms_reference: "Required terms reference",
  destination_url_required: "Destination URL required",
  required_brand_text: "Required brand text",
};

/** Never claim legal compliance. These are the only summary sentences the product uses. */
export const OUTCOME_SUMMARIES: Record<CheckOutcome, string> = {
  no_issue_detected: "No potential issue detected under the configured automated checks.",
  review_required:
    "Items flagged for human review. Human compliance review required.",
  potential_issue: "Potential issue detected. Human compliance review required.",
};

export const OUTCOME_LABELS: Record<CheckOutcome, string> = {
  no_issue_detected: "No potential issue detected",
  review_required: "Review required",
  potential_issue: "Potential issue detected",
};

// 4 MB keeps uploads under the ~4.5 MB request limit of Vercel functions.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
