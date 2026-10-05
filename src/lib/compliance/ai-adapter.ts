/**
 * Layer 2: AI adapter.
 *
 * The product will later use an LLM to compare creative copy against uploaded
 * policy documents, identify potential wording conflicts, explain and summarise
 * findings. This file defines the interface and a deterministic MOCK used until
 * credentials are configured.
 *
 * Rules for every provider (do not relax):
 *  - Findings may only use the statuses PASS / POTENTIAL ISSUE / REVIEW REQUIRED.
 *  - Never state that a creative is legally compliant.
 *  - Never suggest how to make gambling advertising more persuasive or effective;
 *    only flag potential issues for human review.
 */
import type { CheckInput, FindingDraft, RuleDefinition } from "./types";
import { excerpt, findPhrases } from "./text";

export interface AiReviewProvider {
  /** Shown on check runs and approval records. */
  readonly name: string;
  review(input: CheckInput, rules: RuleDefinition[]): Promise<FindingDraft[]>;
}

const SUBSTANTIATION_PHRASES = [
  "best odds",
  "biggest",
  "highest payouts",
  "number one",
  "no. 1",
  "#1",
  "unbeatable",
];

/** Mock provider: simple, transparent heuristics, clearly labelled as such. */
export class MockAiProvider implements AiReviewProvider {
  readonly name = "mock";

  async review(input: CheckInput): Promise<FindingDraft[]> {
    const findings: FindingDraft[] = [];

    if (input.hasImage) {
      findings.push({
        source: "ai",
        category: "Visual content",
        status: "review_required",
        severity: "medium",
        title: "Image content requires human review",
        explanation:
          "Automated checks read the creative text only. Text, imagery, logos and small print inside the uploaded image were not analysed and must be checked by a reviewer.",
        evidence: "An image file is attached to this version.",
        ruleId: null,
        ruleReference: "AI-ASSIST (mock) · visual content",
        policyId: null,
        policyVersion: null,
      });
    }

    const claims = findPhrases(input.creativeText, SUBSTANTIATION_PHRASES);
    if (claims.length > 0) {
      findings.push({
        source: "ai",
        category: "Claims substantiation",
        status: "review_required",
        severity: "medium",
        title: "Comparative or superlative claim detected",
        explanation:
          "The copy contains a comparative or superlative claim. A reviewer should confirm whether the claim is permitted and can be substantiated.",
        evidence: claims.map((m) => excerpt(input.creativeText, m)).join(" | "),
        ruleId: null,
        ruleReference: "AI-ASSIST (mock) · claims",
        policyId: null,
        policyVersion: null,
      });
    }

    return findings;
  }
}

export function getAiProvider(name: string = "mock"): AiReviewProvider {
  switch (name) {
    case "mock":
      return new MockAiProvider();
    default:
      throw new Error(
        `Unknown AI_PROVIDER "${name}". Only "mock" is available in this version.`,
      );
  }
}
