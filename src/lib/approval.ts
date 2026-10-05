/**
 * Approval records are frozen evidence: everything shown on the record is copied
 * into a JSON snapshot at approval time, so later edits to brands, policies or
 * users never change what an approval record says.
 * (No "server-only" import so the seed script can reuse it.)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { CHANNEL_LABELS } from "@/lib/constants";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CheckOutcome,
  FindingSeverity,
  FindingStatus,
  ReviewDecision,
} from "@/lib/types";

export const APPROVAL_DISCLAIMER =
  "This record documents an internal compliance review decision made by the named reviewer. " +
  "Automated checks are a first-pass aid against the configured policies listed above and do " +
  "not constitute legal advice or a determination of legal compliance.";

export type ApprovalSnapshot = {
  schema_version: 1;
  organization: { id: string; name: string };
  submission: {
    id: string;
    campaign_name: string;
    channel: string;
    channel_label: string;
    created_by: { name: string; email: string };
    created_at: string;
    submitted_at: string | null;
  };
  brand: { id: string; name: string };
  jurisdiction: { code: string; name: string };
  version: {
    id: string;
    number: number;
    total_versions: number;
    creative_text: string;
    destination_url: string | null;
    change_note: string;
    created_at: string;
    files: { file_name: string; mime_type: string; size_bytes: number; storage_path: string }[];
  };
  check_run: {
    id: string;
    created_at: string;
    outcome: CheckOutcome;
    summary: string;
    pass_count: number;
    potential_issue_count: number;
    review_required_count: number;
    ai_provider: string;
  };
  findings: {
    status: FindingStatus;
    severity: FindingSeverity;
    category: string;
    title: string;
    explanation: string;
    evidence: string;
    rule_reference: string;
    source: string;
  }[];
  policies: { policy_id: string; name: string; version: number; is_demo: boolean }[];
  reviewer: { id: string; name: string; email: string };
  approved_at: string;
  review_comment: string;
  review_history: {
    decision: ReviewDecision;
    comment: string;
    reviewer: string;
    version_number: number;
    created_at: string;
  }[];
  disclaimer: string;
};

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`Could not build approval record (${what}): ${error?.message ?? "not found"}`);
}

export async function buildApprovalSnapshot(
  db: SupabaseClient<Database>,
  ids: { submissionId: string; versionId: string; checkRunId: string; reviewId: string; approvedAt: string },
): Promise<ApprovalSnapshot> {
  const sub = await db
    .from("submissions")
    .select(
      "*, organization:organizations(id, name), brand:brands(id, name), jurisdiction:jurisdictions(code, name), creator:profiles!submissions_created_by_fkey(full_name, email)",
    )
    .eq("id", ids.submissionId)
    .single();
  if (sub.error || !sub.data) fail("submission", sub.error);
  const s = sub.data;

  const [version, files, run, findings, review, history, versionCount] = await Promise.all([
    db.from("submission_versions").select("*").eq("id", ids.versionId).single(),
    db.from("creative_files").select("*").eq("version_id", ids.versionId),
    db.from("check_runs").select("*").eq("id", ids.checkRunId).single(),
    db.from("findings").select("*").eq("check_run_id", ids.checkRunId),
    db
      .from("reviews")
      .select("*, reviewer:profiles!reviews_reviewer_id_fkey(id, full_name, email)")
      .eq("id", ids.reviewId)
      .single(),
    db
      .from("reviews")
      .select(
        "decision, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email), version:submission_versions(version_number)",
      )
      .eq("submission_id", ids.submissionId)
      .order("created_at"),
    db
      .from("submission_versions")
      .select("id", { count: "exact", head: true })
      .eq("submission_id", ids.submissionId),
  ]);
  if (version.error || !version.data) fail("version", version.error);
  if (files.error) fail("files", files.error);
  if (run.error || !run.data) fail("check run", run.error);
  if (findings.error) fail("findings", findings.error);
  if (review.error || !review.data) fail("review", review.error);
  if (history.error) fail("review history", history.error);

  const snapshotPolicies = Array.isArray(run.data.policy_snapshot)
    ? (run.data.policy_snapshot as { policy_id: string; name: string; version: number; is_demo: boolean }[])
    : [];
  const order = { potential_issue: 0, review_required: 1, pass: 2 } as const;

  return {
    schema_version: 1,
    organization: { id: s.organization!.id, name: s.organization!.name },
    submission: {
      id: s.id,
      campaign_name: s.campaign_name,
      channel: s.channel,
      channel_label: CHANNEL_LABELS[s.channel],
      created_by: { name: s.creator?.full_name ?? "", email: s.creator?.email ?? "" },
      created_at: s.created_at,
      submitted_at: s.submitted_at,
    },
    brand: { id: s.brand!.id, name: s.brand!.name },
    jurisdiction: { code: s.jurisdiction!.code, name: s.jurisdiction!.name },
    version: {
      id: version.data.id,
      number: version.data.version_number,
      total_versions: versionCount.count ?? version.data.version_number,
      creative_text: version.data.creative_text,
      destination_url: version.data.destination_url,
      change_note: version.data.change_note,
      created_at: version.data.created_at,
      files: files.data.map((f) => ({
        file_name: f.file_name,
        mime_type: f.mime_type,
        size_bytes: f.size_bytes,
        storage_path: f.storage_path,
      })),
    },
    check_run: {
      id: run.data.id,
      created_at: run.data.created_at,
      outcome: run.data.outcome,
      summary: run.data.summary,
      pass_count: run.data.pass_count,
      potential_issue_count: run.data.potential_issue_count,
      review_required_count: run.data.review_required_count,
      ai_provider: run.data.ai_provider,
    },
    findings: [...findings.data]
      .sort((a, b) => order[a.status] - order[b.status])
      .map((f) => ({
        status: f.status,
        severity: f.severity,
        category: f.category,
        title: f.title,
        explanation: f.explanation,
        evidence: f.evidence,
        rule_reference: f.rule_reference,
        source: f.source,
      })),
    policies: snapshotPolicies.map((p) => ({
      policy_id: p.policy_id,
      name: p.name,
      version: p.version,
      is_demo: p.is_demo,
    })),
    reviewer: {
      id: review.data.reviewer_id,
      name: review.data.reviewer?.full_name ?? "",
      email: review.data.reviewer?.email ?? "",
    },
    approved_at: ids.approvedAt,
    review_comment: review.data.comment,
    review_history: history.data.map((h) => ({
      decision: h.decision,
      comment: h.comment,
      reviewer: h.reviewer?.full_name || h.reviewer?.email || "",
      version_number: h.version?.version_number ?? 0,
      created_at: h.created_at,
    })),
    disclaimer: APPROVAL_DISCLAIMER,
  };
}
