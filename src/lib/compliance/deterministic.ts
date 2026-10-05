/**
 * Layer 1: deterministic rules.
 * Each rule produces at most one finding: PASS or POTENTIAL ISSUE.
 * Rules that do not apply to the submission's channel produce no finding.
 */
import type { CheckInput, FindingDraft, RuleDefinition } from "./types";
import { excerpt, findPhrases, isValidHttpUrl, quoteList } from "./text";

function base(rule: RuleDefinition): Omit<FindingDraft, "status" | "severity" | "evidence" | "title"> {
  return {
    source: "rule",
    category: rule.category,
    explanation: rule.explanation,
    ruleId: rule.id,
    ruleReference: `${rule.code} · ${rule.policyName} v${rule.policyVersion}`,
    policyId: rule.policyId,
    policyVersion: rule.policyVersion,
  };
}

function pass(rule: RuleDefinition, evidence: string): FindingDraft {
  return { ...base(rule), status: "pass", severity: "low", title: rule.title, evidence };
}

function issue(rule: RuleDefinition, title: string, evidence: string): FindingDraft {
  return { ...base(rule), status: "potential_issue", severity: rule.severity, title, evidence };
}

function requiredText(rule: RuleDefinition, input: CheckInput, phrases: string[], missingTitle: string) {
  if (phrases.length === 0) {
    return issue(rule, `${rule.title}: rule has no phrases configured`, "Rule configuration is incomplete; ask an admin to add phrases.");
  }
  const found = findPhrases(input.creativeText, phrases);
  const ok = rule.match === "all" ? found.length === phrases.length : found.length > 0;
  if (ok) {
    return pass(rule, `Found: ${found.map((m) => excerpt(input.creativeText, m)).join(" | ")}`);
  }
  const missing = phrases.filter((p) => !found.some((f) => f.phrase === p));
  const expectation =
    rule.match === "all"
      ? `All of ${quoteList(phrases)} are required. Missing: ${quoteList(missing)}.`
      : `None of ${quoteList(phrases)} was found in the creative text.`;
  return issue(rule, missingTitle, expectation);
}

export function appliesToChannel(rule: RuleDefinition, input: CheckInput) {
  return rule.channels.length === 0 || rule.channels.includes(input.channel);
}

export function evaluateRule(rule: RuleDefinition, input: CheckInput): FindingDraft | null {
  if (!appliesToChannel(rule, input)) return null;

  switch (rule.ruleType) {
    case "required_phrase":
      return requiredText(rule, input, rule.phrases, `Required phrase missing: ${rule.title}`);
    case "required_disclaimer":
      return requiredText(rule, input, rule.phrases, `Required disclaimer missing: ${rule.title}`);
    case "required_terms_reference":
      return requiredText(rule, input, rule.phrases, `Terms reference missing: ${rule.title}`);
    case "required_brand_text": {
      const phrases = rule.phrases.length > 0 ? rule.phrases : [input.brandName];
      return requiredText(rule, input, phrases, `Required brand text missing: ${rule.title}`);
    }
    case "prohibited_phrase": {
      const found = findPhrases(input.creativeText, rule.phrases);
      if (found.length === 0) {
        return pass(rule, `None of ${quoteList(rule.phrases)} was found.`);
      }
      return issue(
        rule,
        `Prohibited phrase present: ${rule.title}`,
        found.map((m) => excerpt(input.creativeText, m)).join(" | "),
      );
    }
    case "destination_url_required": {
      if (isValidHttpUrl(input.destinationUrl)) {
        return pass(rule, `Destination URL: ${input.destinationUrl}`);
      }
      return issue(
        rule,
        "Destination URL missing",
        input.destinationUrl
          ? `“${input.destinationUrl}” is not a valid http(s) URL.`
          : "No destination URL was provided.",
      );
    }
    default: {
      const exhaustive: never = rule.ruleType;
      throw new Error(`Unknown rule type: ${String(exhaustive)}`);
    }
  }
}

export function runDeterministicChecks(input: CheckInput, rules: RuleDefinition[]): FindingDraft[] {
  return rules
    .map((rule) => evaluateRule(rule, input))
    .filter((f): f is FindingDraft => f !== null);
}
