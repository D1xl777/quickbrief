"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole, type CurrentMember } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { check, formString, toActionError, UserFacingError } from "@/lib/action-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, Channel } from "@/lib/types";
import { lines, policySchema, ruleSchema, uuid } from "@/lib/validation";

type Admin = ReturnType<typeof createAdminClient>;

async function loadPolicy(admin: Admin, member: CurrentMember, policyId: string) {
  return check(
    await admin
      .from("policies")
      .select("*")
      .eq("id", policyId)
      .eq("organization_id", member.organization.id)
      .maybeSingle(),
    "load the policy",
  );
}

/** Any change to a policy's rules creates a new policy version. */
async function bumpVersion(admin: Admin, policyId: string, current: number) {
  check(
    await admin
      .from("policies")
      .update({ version: current + 1 })
      .eq("id", policyId)
      .eq("version", current)
      .select("id")
      .single(),
    "update the policy version",
  );
  return current + 1;
}

export async function createPolicy(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let policyId: string;
  try {
    const member = await requireRole(["admin"]);
    const input = policySchema.parse({
      name: formString(formData, "name"),
      description: formString(formData, "description"),
      jurisdiction_id: formString(formData, "jurisdiction_id") || null,
      brand_id: formString(formData, "brand_id") || null,
    });
    const admin = createAdminClient();
    const orgId = member.organization.id;

    if (input.jurisdiction_id) {
      check(
        await admin
          .from("jurisdictions")
          .select("id")
          .eq("id", input.jurisdiction_id)
          .eq("organization_id", orgId)
          .maybeSingle(),
        "find the jurisdiction",
      );
    }
    if (input.brand_id) {
      check(
        await admin
          .from("brands")
          .select("id")
          .eq("id", input.brand_id)
          .eq("organization_id", orgId)
          .maybeSingle(),
        "find the brand",
      );
    }

    const policy = check(
      await admin
        .from("policies")
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description,
          jurisdiction_id: input.jurisdiction_id,
          brand_id: input.brand_id,
          is_demo: formString(formData, "is_demo") === "on",
          created_by: member.userId,
        })
        .select("id")
        .single(),
      "create the policy",
    );
    policyId = policy.id;
    await recordAudit(admin, member, {
      action: "policy.created",
      entityType: "policy",
      entityId: policy.id,
      description: `Created policy "${input.name}"`,
      metadata: { jurisdiction_id: input.jurisdiction_id, brand_id: input.brand_id },
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/policies");
  redirect(`/policies/${policyId}`);
}

export async function addRule(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireRole(["admin"]);
    const policyId = uuid.parse(formString(formData, "policy_id"));
    const input = ruleSchema.parse({
      code: formString(formData, "code"),
      title: formString(formData, "title"),
      rule_type: formString(formData, "rule_type"),
      category: formString(formData, "category"),
      severity: formString(formData, "severity"),
      phrases: lines(formString(formData, "phrases")),
      match: formString(formData, "match") || "any",
      channels: formData.getAll("channels").map(String),
      explanation: formString(formData, "explanation"),
    });
    const admin = createAdminClient();
    const policy = await loadPolicy(admin, member, policyId);

    const { data: rule, error } = await admin
      .from("policy_rules")
      .insert({
        organization_id: member.organization.id,
        policy_id: policy.id,
        code: input.code,
        title: input.title,
        rule_type: input.rule_type,
        category: input.category,
        severity: input.severity,
        config: { phrases: input.phrases, match: input.match },
        channels: input.channels as Channel[],
        explanation: input.explanation,
      })
      .select("id")
      .single();
    if (error?.code === "23505") {
      throw new UserFacingError(`Rule code ${input.code} already exists in this policy.`);
    }
    if (error || !rule) throw new UserFacingError("Could not add the rule.");

    const version = await bumpVersion(admin, policy.id, policy.version);
    await recordAudit(admin, member, {
      action: "policy.rule_added",
      entityType: "policy",
      entityId: policy.id,
      description: `Added rule ${input.code} to "${policy.name}" (now v${version})`,
      metadata: { rule_id: rule.id, code: input.code, rule_type: input.rule_type, version },
    });
    revalidatePath(`/policies/${policy.id}`);
    revalidatePath("/policies");
    return { ok: true, message: `Rule ${input.code} added. Policy is now version ${version}.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setRuleActive(formData: FormData): Promise<void> {
  const member = await requireRole(["admin"]);
  const ruleId = uuid.parse(formString(formData, "rule_id"));
  const active = formString(formData, "active") === "true";
  const admin = createAdminClient();

  const rule = check(
    await admin
      .from("policy_rules")
      .select("id, code, policy_id")
      .eq("id", ruleId)
      .eq("organization_id", member.organization.id)
      .maybeSingle(),
    "load the rule",
  );
  const policy = await loadPolicy(admin, member, rule.policy_id);
  check(
    await admin.from("policy_rules").update({ is_active: active }).eq("id", rule.id).select("id").single(),
    "update the rule",
  );
  const version = await bumpVersion(admin, policy.id, policy.version);
  await recordAudit(admin, member, {
    action: active ? "policy.rule_activated" : "policy.rule_deactivated",
    entityType: "policy",
    entityId: policy.id,
    description: `${active ? "Activated" : "Deactivated"} rule ${rule.code} in "${policy.name}" (now v${version})`,
    metadata: { rule_id: rule.id, version },
  });
  revalidatePath(`/policies/${policy.id}`);
}

export async function setPolicyStatus(formData: FormData): Promise<void> {
  const member = await requireRole(["admin"]);
  const policyId = uuid.parse(formString(formData, "policy_id"));
  const status = formString(formData, "status") === "active" ? "active" : "inactive";
  const admin = createAdminClient();
  const policy = await loadPolicy(admin, member, policyId);
  check(
    await admin.from("policies").update({ status }).eq("id", policy.id).select("id").single(),
    "update the policy",
  );
  await recordAudit(admin, member, {
    action: status === "active" ? "policy.activated" : "policy.deactivated",
    entityType: "policy",
    entityId: policy.id,
    description: `${status === "active" ? "Activated" : "Deactivated"} policy "${policy.name}"`,
  });
  revalidatePath(`/policies/${policy.id}`);
  revalidatePath("/policies");
}
