import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  DECISION_LABELS,
  FINDING_STATUS_LABELS,
  OUTCOME_LABELS,
  ROLE_LABELS,
  SEVERITY_LABELS,
  SUBMISSION_STATUS_LABELS,
} from "@/lib/constants";
import type {
  CheckOutcome,
  FindingSeverity,
  FindingStatus,
  MemberRole,
  ReviewDecision,
  SubmissionStatus,
} from "@/lib/types";

const SUBMISSION_TONES: Record<SubmissionStatus, BadgeTone> = {
  draft: "neutral",
  checked: "blue",
  pending_review: "violet",
  changes_requested: "amber",
  approved: "green",
  rejected: "red",
};

export function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <Badge tone={SUBMISSION_TONES[status]} dot>
      {SUBMISSION_STATUS_LABELS[status]}
    </Badge>
  );
}

const FINDING_TONES: Record<FindingStatus, BadgeTone> = {
  pass: "green",
  potential_issue: "red",
  review_required: "amber",
};

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  return <Badge tone={FINDING_TONES[status]}>{FINDING_STATUS_LABELS[status].toUpperCase()}</Badge>;
}

const SEVERITY_TONES: Record<FindingSeverity, BadgeTone> = {
  low: "neutral",
  medium: "orange",
  high: "red",
};

export function SeverityBadge({ severity }: { severity: FindingSeverity }) {
  return <Badge tone={SEVERITY_TONES[severity]}>{SEVERITY_LABELS[severity]}</Badge>;
}

const OUTCOME_TONES: Record<CheckOutcome, BadgeTone> = {
  no_issue_detected: "green",
  review_required: "amber",
  potential_issue: "red",
};

export function OutcomeBadge({ outcome }: { outcome: CheckOutcome }) {
  return <Badge tone={OUTCOME_TONES[outcome]}>{OUTCOME_LABELS[outcome]}</Badge>;
}

const DECISION_TONES: Record<ReviewDecision, BadgeTone> = {
  approved: "green",
  changes_requested: "amber",
  rejected: "red",
  comment: "neutral",
};

export function DecisionBadge({ decision }: { decision: ReviewDecision }) {
  return <Badge tone={DECISION_TONES[decision]}>{DECISION_LABELS[decision]}</Badge>;
}

const ROLE_TONES: Record<MemberRole, BadgeTone> = {
  admin: "violet",
  marketing: "blue",
  compliance: "green",
};

export function RoleBadge({ role }: { role: MemberRole }) {
  return <Badge tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Badge>;
}

export function DemoBadge() {
  return <Badge tone="orange">DEMO POLICY RULES</Badge>;
}
