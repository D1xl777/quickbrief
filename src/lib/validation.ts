import { z } from "zod";
import { CHANNELS } from "@/lib/constants";

const trimmed = (max: number) => z.string().trim().max(max, `Must be at most ${max} characters.`);

export const uuid = z.uuid("Invalid identifier.");

export const brandSchema = z.object({
  name: trimmed(120).min(1, "Brand name is required."),
  description: trimmed(2000),
  internal_notes: trimmed(5000),
  status: z.enum(["active", "inactive"]),
  jurisdiction_ids: z.array(uuid).default([]),
});

export const jurisdictionSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9-]{2,10}$/, "Code must be 2–10 letters, digits or dashes (e.g. UK, SE)."),
  name: trimmed(120).min(1, "Name is required."),
});

export const policySchema = z.object({
  name: trimmed(200).min(1, "Policy name is required."),
  description: trimmed(5000),
  jurisdiction_id: uuid.nullable(),
  brand_id: uuid.nullable(),
});

export const RULE_TYPES = [
  "required_phrase",
  "prohibited_phrase",
  "required_disclaimer",
  "required_terms_reference",
  "destination_url_required",
  "required_brand_text",
] as const;

export const ruleSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_.-]{1,40}$/, "Code may only contain letters, digits, dot, dash, underscore."),
    title: trimmed(200).min(1, "Title is required."),
    rule_type: z.enum(RULE_TYPES),
    category: trimmed(80).min(1, "Category is required."),
    severity: z.enum(["low", "medium", "high"]),
    phrases: z.array(trimmed(300).min(1)).max(50, "At most 50 phrases."),
    match: z.enum(["any", "all"]),
    channels: z.array(z.enum(CHANNELS as [string, ...string[]])).default([]),
    explanation: trimmed(2000).min(1, "Explain why this rule exists."),
  })
  .refine(
    (r) =>
      r.rule_type === "destination_url_required" ||
      r.rule_type === "required_brand_text" ||
      r.phrases.length > 0,
    { message: "Add at least one phrase (one per line).", path: ["phrases"] },
  );

export const memberSchema = z.object({
  full_name: trimmed(120).min(1, "Name is required."),
  email: z.email("Enter a valid email address."),
  role: z.enum(["admin", "marketing", "compliance"]),
  password: z.string().min(10, "Temporary password must be at least 10 characters."),
});

export const organizationSchema = z.object({
  name: trimmed(200).min(1, "Organisation name is required."),
});

/** Splits a textarea into non-empty trimmed lines. */
export function lines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}
