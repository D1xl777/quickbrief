/**
 * DEMO POLICY RULES.
 * These exist only to demonstrate product functionality. They are NOT statements
 * of current gambling law or regulator requirements in any jurisdiction.
 */
import type { Channel, FindingSeverity, RuleType } from "../../src/lib/types";

export type DemoRule = {
  code: string;
  title: string;
  rule_type: RuleType;
  category: string;
  severity: FindingSeverity;
  phrases?: string[];
  match?: "any" | "all";
  channels?: Channel[];
  explanation: string;
};

export type DemoPolicy = {
  name: string;
  description: string;
  jurisdictionCode: string | null;
  brandName: string | null;
  rules: DemoRule[];
};

const DEMO_NOTE =
  "DEMO POLICY RULES: illustrative only, not legal advice and not a statement of current law.";

export const DEMO_POLICIES: DemoPolicy[] = [
  {
    name: "DEMO Group Marketing Standards",
    description: `Internal group-wide demo standards applied to every brand and jurisdiction. ${DEMO_NOTE}`,
    jurisdictionCode: null,
    brandName: null,
    rules: [
      {
        code: "DEMO-GRP-001",
        title: "No guaranteed-outcome wording",
        rule_type: "prohibited_phrase",
        category: "Misleading claims",
        severity: "high",
        phrases: ["guaranteed win", "guaranteed winnings", "risk-free", "can't lose", "sure win"],
        explanation:
          "Creative copy must not suggest that outcomes are certain or that there is no risk.",
      },
      {
        code: "DEMO-GRP-002",
        title: "No financial-solution framing",
        rule_type: "prohibited_phrase",
        category: "Social responsibility",
        severity: "high",
        phrases: ["pay your bills", "solve your money problems", "easy money", "get rich"],
        explanation:
          "Creative copy must not present gambling as a way to earn income or solve financial problems.",
      },
      {
        code: "DEMO-GRP-003",
        title: "Brand name must be shown",
        rule_type: "required_brand_text",
        category: "Brand identification",
        severity: "low",
        explanation: "The operating brand must be clearly identifiable in the creative copy.",
      },
      {
        code: "DEMO-GRP-004",
        title: "Destination URL required",
        rule_type: "destination_url_required",
        category: "Traceability",
        severity: "medium",
        channels: ["social_media", "display_advertising", "email", "affiliate_creative", "landing_page"],
        explanation:
          "Clickable creatives must record their destination URL so the landing page can also be reviewed.",
      },
    ],
  },
  {
    name: "DEMO UK Marketing Policy",
    description: `Demo rules for United Kingdom creatives. ${DEMO_NOTE}`,
    jurisdictionCode: "UK",
    brandName: null,
    rules: [
      {
        code: "DEMO-UK-001",
        title: "Age restriction notice (18+)",
        rule_type: "required_disclaimer",
        category: "Age restriction",
        severity: "high",
        phrases: ["18+"],
        explanation: "Demo rule: creative must display an 18+ age notice.",
      },
      {
        code: "DEMO-UK-002",
        title: "Safer gambling message",
        rule_type: "required_phrase",
        category: "Safer gambling",
        severity: "high",
        phrases: ["Please gamble responsibly", "Take time to think"],
        explanation: "Demo rule: creative must include one of the configured safer gambling messages.",
      },
      {
        code: "DEMO-UK-003",
        title: "Terms reference for offers",
        rule_type: "required_terms_reference",
        category: "Terms & conditions",
        severity: "medium",
        phrases: ["T&Cs apply", "Terms apply", "Full terms", "T&Cs"],
        explanation: "Demo rule: creative must reference the applicable terms and conditions.",
      },
      {
        code: "DEMO-UK-004",
        title: "No pressure or urgency wording",
        rule_type: "prohibited_phrase",
        category: "Pressure tactics",
        severity: "medium",
        phrases: ["act now", "last chance", "hurry", "don't miss out"],
        explanation: "Demo rule: creative should not pressure the audience to gamble immediately.",
      },
      {
        code: "DEMO-UK-005",
        title: "No youth-oriented references",
        rule_type: "prohibited_phrase",
        category: "Protection of minors",
        severity: "high",
        phrases: ["students", "school", "teens"],
        explanation: "Demo rule: creative must not reference or appeal to young audiences.",
      },
    ],
  },
  {
    name: "DEMO Sweden Marketing Policy",
    description: `Demo rules for Sweden creatives. ${DEMO_NOTE}`,
    jurisdictionCode: "SE",
    brandName: null,
    rules: [
      {
        code: "DEMO-SE-001",
        title: "Age restriction notice (18+)",
        rule_type: "required_disclaimer",
        category: "Age restriction",
        severity: "high",
        phrases: ["18+"],
        explanation: "Demo rule: creative must display an 18+ age notice.",
      },
      {
        code: "DEMO-SE-002",
        title: "Responsible play message",
        rule_type: "required_phrase",
        category: "Safer gambling",
        severity: "high",
        phrases: ["Spela ansvarsfullt"],
        explanation: "Demo rule: creative must include the configured responsible play message.",
      },
      {
        code: "DEMO-SE-003",
        title: "Terms reference",
        rule_type: "required_terms_reference",
        category: "Terms & conditions",
        severity: "medium",
        phrases: ["Regler och villkor gäller", "T&Cs apply"],
        explanation: "Demo rule: creative must reference the applicable terms.",
      },
    ],
  },
  {
    name: "DEMO Netherlands Marketing Policy",
    description: `Demo rules for Netherlands creatives. ${DEMO_NOTE}`,
    jurisdictionCode: "NL",
    brandName: null,
    rules: [
      {
        code: "DEMO-NL-001",
        title: "Age restriction notice (18+)",
        rule_type: "required_disclaimer",
        category: "Age restriction",
        severity: "high",
        phrases: ["18+"],
        explanation: "Demo rule: creative must display an 18+ age notice.",
      },
      {
        code: "DEMO-NL-002",
        title: "Moderation message",
        rule_type: "required_phrase",
        category: "Safer gambling",
        severity: "high",
        phrases: ["Speel bewust"],
        explanation: "Demo rule: creative must include the configured moderation message.",
      },
      {
        code: "DEMO-NL-003",
        title: "No bonus wording in SMS",
        rule_type: "prohibited_phrase",
        category: "Offers",
        severity: "medium",
        phrases: ["bonus", "free spins"],
        channels: ["sms"],
        explanation: "Demo rule: SMS messages must not promote bonus offers.",
      },
    ],
  },
  {
    name: "DEMO Orbit Casino Brand Guidelines",
    description: `Internal brand guidelines for Orbit Casino. ${DEMO_NOTE}`,
    jurisdictionCode: null,
    brandName: "Orbit Casino",
    rules: [
      {
        code: "DEMO-ORB-001",
        title: "Use the full brand name",
        rule_type: "required_brand_text",
        category: "Brand identification",
        severity: "low",
        phrases: ["Orbit Casino"],
        explanation: "Brand guideline: always use the full brand name “Orbit Casino”.",
      },
      {
        code: "DEMO-ORB-002",
        title: "No “free money” wording",
        rule_type: "prohibited_phrase",
        category: "Misleading claims",
        severity: "medium",
        phrases: ["free money", "free cash"],
        explanation: "Brand guideline: never describe offers as free money or free cash.",
      },
    ],
  },
];
