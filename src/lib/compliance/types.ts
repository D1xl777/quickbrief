// Types for the automated checking engine. No framework or database code here.
import type {
  Channel,
  CheckOutcome,
  FindingSeverity,
  FindingStatus,
  RuleType,
} from "@/lib/types";

/** What is being checked. */
export type CheckInput = {
  creativeText: string;
  destinationUrl: string | null;
  channel: Channel;
  brandName: string;
  jurisdictionCode: string;
  hasImage: boolean;
};

/** A rule as the engine sees it (flattened from policies + policy_rules). */
export type RuleDefinition = {
  id: string;
  code: string;
  title: string;
  ruleType: RuleType;
  category: string;
  severity: FindingSeverity;
  phrases: string[];
  match: "any" | "all";
  channels: Channel[];
  explanation: string;
  policyId: string;
  policyName: string;
  policyVersion: number;
  isDemo: boolean;
};

/** A finding before it is stored. */
export type FindingDraft = {
  source: "rule" | "ai";
  category: string;
  status: FindingStatus;
  severity: FindingSeverity;
  title: string;
  explanation: string;
  evidence: string;
  ruleId: string | null;
  ruleReference: string;
  policyId: string | null;
  policyVersion: number | null;
};

export type CheckResult = {
  outcome: CheckOutcome;
  summary: string;
  findings: FindingDraft[];
  counts: { pass: number; potentialIssue: number; reviewRequired: number };
  aiProvider: string;
};
