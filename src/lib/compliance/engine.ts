/**
 * The checking engine: runs Layer 1 (deterministic rules) and Layer 2 (AI adapter)
 * and summarises the result. The summary never claims legal compliance.
 */
import { OUTCOME_SUMMARIES } from "@/lib/constants";
import type { CheckOutcome } from "@/lib/types";
import type { AiReviewProvider } from "./ai-adapter";
import { runDeterministicChecks } from "./deterministic";
import type { CheckInput, CheckResult, FindingDraft, RuleDefinition } from "./types";

const STATUS_ORDER = { potential_issue: 0, review_required: 1, pass: 2 } as const;
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function sortFindings<T extends Pick<FindingDraft, "status" | "severity">>(findings: T[]): T[] {
  return [...findings].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
  );
}

export function summarise(findings: Pick<FindingDraft, "status">[]) {
  const counts = {
    pass: findings.filter((f) => f.status === "pass").length,
    potentialIssue: findings.filter((f) => f.status === "potential_issue").length,
    reviewRequired: findings.filter((f) => f.status === "review_required").length,
  };
  const outcome: CheckOutcome =
    counts.potentialIssue > 0
      ? "potential_issue"
      : counts.reviewRequired > 0
        ? "review_required"
        : "no_issue_detected";
  return { counts, outcome, summary: OUTCOME_SUMMARIES[outcome] };
}

export async function runChecks(
  input: CheckInput,
  rules: RuleDefinition[],
  ai: AiReviewProvider,
): Promise<CheckResult> {
  const deterministic = runDeterministicChecks(input, rules);
  const aiFindings = await ai.review(input, rules);
  const findings = sortFindings([...deterministic, ...aiFindings]);

  if (rules.length === 0) {
    findings.push({
      source: "rule",
      category: "Configuration",
      status: "review_required",
      severity: "medium",
      title: "No active policy rules apply",
      explanation:
        "No active policy rules are configured for this brand, jurisdiction and channel, so nothing was checked automatically.",
      evidence: `Jurisdiction ${input.jurisdictionCode}, channel ${input.channel}.`,
      ruleId: null,
      ruleReference: "CONFIGURATION",
      policyId: null,
      policyVersion: null,
    });
  }

  const { counts, outcome, summary } = summarise(findings);
  return { outcome, summary, findings, counts, aiProvider: ai.name };
}
