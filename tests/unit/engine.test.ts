import { describe, expect, it } from "vitest";
import { MockAiProvider, getAiProvider } from "@/lib/compliance/ai-adapter";
import { evaluateRule } from "@/lib/compliance/deterministic";
import { runChecks, summarise } from "@/lib/compliance/engine";
import { excerpt, findPhrases } from "@/lib/compliance/text";
import type { CheckInput, RuleDefinition } from "@/lib/compliance/types";
import { OUTCOME_SUMMARIES } from "@/lib/constants";

function rule(partial: Partial<RuleDefinition>): RuleDefinition {
  return {
    id: "r1",
    code: "DEMO-1",
    title: "Test rule",
    ruleType: "required_phrase",
    category: "Test",
    severity: "high",
    phrases: [],
    match: "any",
    channels: [],
    explanation: "Because.",
    policyId: "p1",
    policyName: "DEMO Policy",
    policyVersion: 3,
    isDemo: true,
    ...partial,
  };
}

const input = (partial: Partial<CheckInput> = {}): CheckInput => ({
  creativeText: "",
  destinationUrl: null,
  channel: "social_media",
  brandName: "NovaBet",
  jurisdictionCode: "UK",
  hasImage: false,
  ...partial,
});

describe("phrase matching", () => {
  it("is case-insensitive and whole-word", () => {
    expect(findPhrases("Back to SCHOOL offer", ["school"])).toHaveLength(1);
    expect(findPhrases("Preschool offer", ["school"])).toHaveLength(0);
  });
  it("handles symbols like 18+ and T&Cs", () => {
    expect(findPhrases("Play now. 18+ only. T&Cs apply.", ["18+", "T&Cs apply"])).toHaveLength(2);
    expect(findPhrases("Ages 118+", ["18+"])).toHaveLength(0);
  });
  it("normalises curly quotes and whitespace", () => {
    expect(findPhrases("You can’t   lose", ["can't lose"])).toHaveLength(1);
  });
  it("produces an excerpt with the match highlighted", () => {
    const text = "Welcome bonus. Risk-free bets for everyone.";
    const [m] = findPhrases(text, ["risk-free"]);
    expect(excerpt(text, m!)).toContain("«Risk-free»");
  });
});

describe("deterministic rules", () => {
  it("required phrase: pass and potential issue", () => {
    const r = rule({ ruleType: "required_disclaimer", phrases: ["18+"] });
    expect(evaluateRule(r, input({ creativeText: "18+ only" }))?.status).toBe("pass");
    const missing = evaluateRule(r, input({ creativeText: "Play now" }));
    expect(missing?.status).toBe("potential_issue");
    expect(missing?.severity).toBe("high");
    expect(missing?.ruleReference).toBe("DEMO-1 · DEMO Policy v3");
  });

  it("match=all requires every phrase", () => {
    const r = rule({ phrases: ["18+", "T&Cs apply"], match: "all" });
    const f = evaluateRule(r, input({ creativeText: "18+ only" }));
    expect(f?.status).toBe("potential_issue");
    expect(f?.evidence).toContain("Missing: “T&Cs apply”");
  });

  it("prohibited phrase reports evidence", () => {
    const r = rule({ ruleType: "prohibited_phrase", phrases: ["risk-free", "sure win"] });
    const f = evaluateRule(r, input({ creativeText: "A risk-free bet!" }));
    expect(f?.status).toBe("potential_issue");
    expect(f?.title).toBe("Prohibited phrase present: Test rule");
    expect(f?.evidence).toContain("«risk-free»");
    expect(evaluateRule(r, input({ creativeText: "Enjoy the match" }))?.status).toBe("pass");
  });

  it("destination URL must be a valid http(s) URL", () => {
    const r = rule({ ruleType: "destination_url_required" });
    expect(evaluateRule(r, input({ destinationUrl: "https://novabet.example.com" }))?.status).toBe("pass");
    expect(evaluateRule(r, input({ destinationUrl: null }))?.status).toBe("potential_issue");
    expect(evaluateRule(r, input({ destinationUrl: "javascript:alert(1)" }))?.status).toBe("potential_issue");
  });

  it("brand text defaults to the submission's brand", () => {
    const r = rule({ ruleType: "required_brand_text" });
    expect(evaluateRule(r, input({ creativeText: "Bet with NovaBet" }))?.status).toBe("pass");
    expect(evaluateRule(r, input({ creativeText: "Bet with us" }))?.status).toBe("potential_issue");
  });

  it("skips rules for other channels", () => {
    const r = rule({ ruleType: "prohibited_phrase", phrases: ["bonus"], channels: ["sms"] });
    expect(evaluateRule(r, input({ channel: "email", creativeText: "bonus" }))).toBeNull();
    expect(evaluateRule(r, input({ channel: "sms", creativeText: "bonus" }))?.status).toBe("potential_issue");
  });
});

describe("engine", () => {
  const rules = [
    rule({ id: "a", code: "A", ruleType: "required_disclaimer", phrases: ["18+"] }),
    rule({ id: "b", code: "B", ruleType: "prohibited_phrase", phrases: ["risk-free"], severity: "medium" }),
  ];

  it("summarises potential issues without claiming compliance", async () => {
    const result = await runChecks(input({ creativeText: "Risk-free fun" }), rules, new MockAiProvider());
    expect(result.outcome).toBe("potential_issue");
    expect(result.summary).toBe("Potential issue detected. Human compliance review required.");
    expect(result.counts).toEqual({ pass: 0, potentialIssue: 2, reviewRequired: 0 });
    // Highest risk first
    expect(result.findings[0]!.severity).toBe("high");
  });

  it("reports no potential issue when all rules pass", async () => {
    const result = await runChecks(input({ creativeText: "18+ Enjoy responsibly" }), rules, new MockAiProvider());
    expect(result.outcome).toBe("no_issue_detected");
    expect(result.summary).toBe("No potential issue detected under the configured automated checks.");
  });

  it("flags images and superlatives for human review", async () => {
    const result = await runChecks(
      input({ creativeText: "18+ The best odds in town", hasImage: true }),
      rules,
      new MockAiProvider(),
    );
    expect(result.outcome).toBe("review_required");
    expect(result.findings.filter((f) => f.source === "ai")).toHaveLength(2);
  });

  it("flags the absence of applicable rules", async () => {
    const result = await runChecks(input({ creativeText: "Hello" }), [], new MockAiProvider());
    expect(result.outcome).toBe("review_required");
    expect(result.findings[0]!.title).toBe("No active policy rules apply");
  });

  it("never uses the words 'legally compliant'", () => {
    for (const s of Object.values(OUTCOME_SUMMARIES)) {
      expect(s.toLowerCase()).not.toContain("compliant");
    }
    expect(summarise([]).outcome).toBe("no_issue_detected");
  });

  it("rejects unknown AI providers loudly", () => {
    expect(() => getAiProvider("unknown")).toThrow(/Unknown AI_PROVIDER/);
  });
});
