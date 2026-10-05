/**
 * Loads the applicable rules for a submission, runs the engine and stores the
 * check run + findings. Takes a service-role client: callers MUST have verified
 * the user's permission first. (No "server-only" import so the seed script can reuse it.)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { CheckRun, Submission, SubmissionVersion } from "@/lib/types";
import { getAiProvider } from "./ai-adapter";
import { runChecks } from "./engine";
import type { CheckInput, RuleDefinition } from "./types";

type Client = SupabaseClient<Database>;

export async function loadApplicableRules(
  db: Client,
  submission: Pick<Submission, "organization_id" | "brand_id" | "jurisdiction_id">,
): Promise<RuleDefinition[]> {
  const { data, error } = await db
    .from("policies")
    .select("id, name, version, is_demo, jurisdiction_id, brand_id, policy_rules(*)")
    .eq("organization_id", submission.organization_id)
    .eq("status", "active")
    .or(`jurisdiction_id.is.null,jurisdiction_id.eq.${submission.jurisdiction_id}`)
    .or(`brand_id.is.null,brand_id.eq.${submission.brand_id}`);
  if (error) throw new Error(`Could not load policies: ${error.message}`);

  const rules: RuleDefinition[] = [];
  for (const policy of data) {
    for (const r of policy.policy_rules) {
      if (!r.is_active) continue;
      const config = (r.config ?? {}) as { phrases?: unknown; match?: unknown };
      rules.push({
        id: r.id,
        code: r.code,
        title: r.title,
        ruleType: r.rule_type,
        category: r.category,
        severity: r.severity,
        phrases: Array.isArray(config.phrases) ? config.phrases.map(String) : [],
        match: config.match === "all" ? "all" : "any",
        channels: r.channels,
        explanation: r.explanation,
        policyId: policy.id,
        policyName: policy.name,
        policyVersion: policy.version,
        isDemo: policy.is_demo,
      });
    }
  }
  return rules.sort((a, b) => a.code.localeCompare(b.code));
}

/** Copy of the policies and rules used, stored with the check run as evidence. */
export function policySnapshot(rules: RuleDefinition[]) {
  const byPolicy = new Map<
    string,
    { policy_id: string; name: string; version: number; is_demo: boolean; rules: Json[] }
  >();
  for (const r of rules) {
    const entry = byPolicy.get(r.policyId) ?? {
      policy_id: r.policyId,
      name: r.policyName,
      version: r.policyVersion,
      is_demo: r.isDemo,
      rules: [],
    };
    entry.rules.push({
      id: r.id,
      code: r.code,
      title: r.title,
      rule_type: r.ruleType,
      severity: r.severity,
      phrases: r.phrases,
      match: r.match,
      channels: r.channels,
    });
    byPolicy.set(r.policyId, entry);
  }
  return [...byPolicy.values()];
}

export async function runAndStoreCheck(
  db: Client,
  params: {
    submission: Submission;
    version: SubmissionVersion;
    brandName: string;
    jurisdictionCode: string;
    hasImage: boolean;
    runBy: string;
    aiProviderName?: string;
    createdAt?: string;
  },
): Promise<CheckRun> {
  const { submission, version } = params;
  const rules = await loadApplicableRules(db, submission);
  const input: CheckInput = {
    creativeText: version.creative_text,
    destinationUrl: version.destination_url,
    channel: submission.channel,
    brandName: params.brandName,
    jurisdictionCode: params.jurisdictionCode,
    hasImage: params.hasImage,
  };
  const result = await runChecks(input, rules, getAiProvider(params.aiProviderName));

  const { data: run, error } = await db
    .from("check_runs")
    .insert({
      organization_id: submission.organization_id,
      submission_id: submission.id,
      version_id: version.id,
      run_by: params.runBy,
      outcome: result.outcome,
      summary: result.summary,
      pass_count: result.counts.pass,
      potential_issue_count: result.counts.potentialIssue,
      review_required_count: result.counts.reviewRequired,
      policy_snapshot: policySnapshot(rules) as Json[],
      ai_provider: result.aiProvider,
      ...(params.createdAt ? { created_at: params.createdAt } : {}),
    })
    .select()
    .single();
  if (error || !run) throw new Error(`Could not store the check run: ${error?.message}`);

  if (result.findings.length > 0) {
    const { error: fErr } = await db.from("findings").insert(
      result.findings.map((f) => ({
        organization_id: submission.organization_id,
        submission_id: submission.id,
        version_id: version.id,
        check_run_id: run.id,
        source: f.source,
        category: f.category,
        status: f.status,
        severity: f.severity,
        title: f.title,
        explanation: f.explanation,
        evidence: f.evidence,
        rule_id: f.ruleId,
        rule_reference: f.ruleReference,
        policy_id: f.policyId,
        policy_version: f.policyVersion,
        ...(params.createdAt ? { created_at: params.createdAt } : {}),
      })),
    );
    if (fErr) throw new Error(`Could not store findings: ${fErr.message}`);
  }
  return run;
}
