import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileCheck2, History, ImageOff, Lock } from "lucide-react";
import { AuditFeed } from "@/components/audit-feed";
import { DemoBadge, DecisionBadge, SubmissionStatusBadge } from "@/components/status-badges";
import {
  CommentForm,
  NewVersionForm,
  ReviewDecisionForm,
  RunCheckButton,
  SubmitForReviewButton,
} from "@/components/submission/actions";
import { CheckSummary, FindingsList } from "@/components/submission/findings-panel";
import { VersionHistory, type VersionRow } from "@/components/submission/version-history";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { can, requirePageMember } from "@/lib/auth";
import { CHANNEL_LABELS } from "@/lib/constants";
import { formatBytes, formatDateTime } from "@/lib/format";
import { listAuditEvents } from "@/lib/queries";
import { recordReviewOpened } from "@/lib/review-opened";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import type { CheckRun, Finding } from "@/lib/types";
import { uuid } from "@/lib/validation";

export const metadata: Metadata = { title: "Submission" };

export default async function SubmissionPage(props: PageProps<"/submissions/[id]">) {
  const { id } = await props.params;
  if (!uuid.safeParse(id).success) notFound();
  const params = await props.searchParams;
  const member = await requirePageMember();
  const supabase = await createClient();

  const { data: submission, error } = await supabase
    .from("submissions")
    .select(
      "*, brand:brands(id, name), jurisdiction:jurisdictions(id, name, code), creator:profiles!submissions_created_by_fkey(full_name, email)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the submission: ${error.message}`);
  if (!submission) notFound();

  const [versionsRes, runsRes, reviewsRes, approvalsRes] = await Promise.all([
    supabase
      .from("submission_versions")
      .select("*, author:profiles!submission_versions_created_by_fkey(full_name, email), creative_files(*)")
      .eq("submission_id", id)
      .order("version_number", { ascending: false }),
    supabase.from("check_runs").select("*").eq("submission_id", id).order("created_at", { ascending: false }),
    supabase
      .from("reviews")
      .select("*, reviewer:profiles!reviews_reviewer_id_fkey(full_name, email), version:submission_versions(version_number)")
      .eq("submission_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("approval_records").select("id, reference_code, approved_at, version_id").eq("submission_id", id),
  ]);
  if (versionsRes.error || runsRes.error || reviewsRes.error || approvalsRes.error) {
    throw new Error("Could not load the submission history.");
  }
  const versions = versionsRes.data;
  const runs = runsRes.data;
  const reviews = reviewsRes.data;
  const approval = approvalsRes.data[0] ?? null;

  const current = versions.find((v) => v.id === submission.current_version_id) ?? versions[0];
  if (!current) notFound();
  const requested = typeof params.v === "string" ? Number(params.v) : NaN;
  const viewed = versions.find((v) => v.version_number === requested) ?? current;
  const isCurrent = viewed.id === current.id;

  const latestRunFor = (versionId: string): CheckRun | undefined => runs.find((r) => r.version_id === versionId);
  const viewedRun = latestRunFor(viewed.id);
  let viewedFindings: Finding[] = [];
  if (viewedRun) {
    const { data, error: fErr } = await supabase.from("findings").select("*").eq("check_run_id", viewedRun.id);
    if (fErr) throw new Error("Could not load findings.");
    viewedFindings = data;
  }

  // Compliance reviewer opening a submission that waits for review is audited.
  if (member.role === "compliance" && submission.status === "pending_review" && isCurrent) {
    await recordReviewOpened(member, submission, current);
  }
  const audit = await listAuditEvents(supabase, { submissionId: id, limit: 200 });

  const file = viewed.creative_files[0];
  const urls = await signedUrls([file?.storage_path]);
  const imageUrl = file ? urls.get(file.storage_path) : undefined;

  const isOwner = member.userId === submission.created_by;
  const canEdit = can.createSubmissions(member.role) && (isOwner || member.role === "admin");
  const editable = canEdit && ["draft", "checked", "changes_requested"].includes(submission.status);
  const canDecide =
    can.review(member.role) && submission.status === "pending_review" && !isOwner;
  const currentRun = latestRunFor(current.id);
  const lastDecision = [...reviews].reverse().find((r) => r.decision !== "comment");
  const usesDemoRules = Array.isArray(viewedRun?.policy_snapshot)
    && (viewedRun.policy_snapshot as { is_demo?: boolean }[]).some((p) => p.is_demo);

  const versionRows: VersionRow[] = versions.map((v) => {
    const vr = runs.filter((r) => r.version_id === v.id);
    return {
      id: v.id,
      versionNumber: v.version_number,
      createdAt: v.created_at,
      createdBy: v.author?.full_name || v.author?.email || "—",
      changeNote: v.change_note,
      hasImage: v.creative_files.length > 0,
      latestOutcome: vr[0]?.outcome ?? null,
      potentialIssues: vr[0] ? vr[0].potential_issue_count + vr[0].review_required_count : null,
      checkRuns: vr.length,
      decisions: reviews.filter((r) => r.version_id === v.id && r.decision !== "comment").map((r) => r.decision),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/submissions" className="hover:text-ink">Submissions</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {submission.campaign_name}
            <SubmissionStatusBadge status={submission.status} />
          </span>
        }
        description={`${submission.brand?.name} · ${submission.jurisdiction?.name} · ${CHANNEL_LABELS[submission.channel]} · Version ${current.version_number}`}
        actions={
          <>
            {approval && (
              <ButtonLink href={`/submissions/${id}/approval`} variant="success">
                <FileCheck2 className="size-4" aria-hidden /> Approval record
              </ButtonLink>
            )}
            {editable && submission.status !== "changes_requested" && (
              <RunCheckButton submissionId={id} />
            )}
            {editable && submission.status === "checked" && (
              <SubmitForReviewButton
                submissionId={id}
                warn={(currentRun?.potential_issue_count ?? 0) > 0}
              />
            )}
          </>
        }
      />

      {/* Status guidance */}
      {submission.status === "changes_requested" && lastDecision && (
        <Alert tone="warning" title="Changes requested by compliance">
          “{lastDecision.comment}”, {lastDecision.reviewer?.full_name}, {formatDateTime(lastDecision.created_at)}.
          {editable && " Upload a new version below, run the check again and resubmit."}
        </Alert>
      )}
      {submission.status === "rejected" && lastDecision && (
        <Alert tone="error" title="Rejected">
          “{lastDecision.comment}”, {lastDecision.reviewer?.full_name}, {formatDateTime(lastDecision.created_at)}.
          This submission is closed. Create a new submission for a different creative.
        </Alert>
      )}
      {submission.status === "approved" && approval && (
        <Alert tone="success" title={`Approved · ${approval.reference_code}`}>
          Approved on {formatDateTime(approval.approved_at)}. The approval applies to version{" "}
          {versions.find((v) => v.id === approval.version_id)?.version_number} only.
        </Alert>
      )}
      {submission.status === "pending_review" && !canDecide && (
        <Alert tone="info" title="Waiting for compliance review">
          This version is locked while a Compliance Reviewer reviews it.
        </Alert>
      )}
      {submission.status === "draft" && editable && (
        <Alert tone="info" title="Draft">Run the automated check on this version before submitting it for review.</Alert>
      )}
      {!isCurrent && (
        <Alert tone="info" title={`You are viewing version ${viewed.version_number}`}>
          This is a previous version kept for the record.{" "}
          <Link href={`/submissions/${id}`} className="font-medium underline">
            Back to the current version ({current.version_number})
          </Link>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Creative */}
          <Card>
            <CardHeader
              title={`Creative · Version ${viewed.version_number}${isCurrent ? " (current)" : ""}`}
              description={`Uploaded ${formatDateTime(viewed.created_at)} by ${viewed.author?.full_name || viewed.author?.email}`}
              actions={<Lock className="size-3.5 text-ink-subtle" aria-label="Versions cannot be edited" />}
            />
            <CardBody className="grid gap-5 lg:grid-cols-5">
              <div className="lg:col-span-2">
                {file ? (
                  imageUrl ? (
                    <a href={imageUrl} target="_blank" rel="noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt={`Creative image for version ${viewed.version_number}`}
                        className="max-h-80 w-full rounded-md border border-border bg-zinc-50 object-contain"
                      />
                    </a>
                  ) : (
                    <Alert tone="error">The image could not be loaded.</Alert>
                  )
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-ink-subtle">
                    <ImageOff className="size-5" aria-hidden /> No image
                  </div>
                )}
                {file && (
                  <p className="mt-2 truncate text-[11px] text-ink-subtle">
                    {file.file_name} · {formatBytes(file.size_bytes)}
                  </p>
                )}
              </div>
              <div className="space-y-4 lg:col-span-3">
                <div>
                  <p className="text-xs text-ink-subtle">Creative text</p>
                  <div
                    className="mt-1 rounded-md border border-border bg-zinc-50 p-3 font-mono text-[13px] whitespace-pre-wrap text-ink"
                    data-testid="creative-text"
                  >
                    {viewed.creative_text || <span className="text-ink-subtle">No text</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-ink-subtle">Destination URL</p>
                  {viewed.destination_url ? (
                    <a
                      href={viewed.destination_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-0.5 inline-flex items-center gap-1 text-[13px] break-all text-brand-600 hover:underline"
                    >
                      {viewed.destination_url} <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : (
                    <p className="mt-0.5 text-[13px] text-ink-subtle">Not provided</p>
                  )}
                </div>
                {submission.internal_notes && (
                  <div>
                    <p className="text-xs text-ink-subtle">Internal notes</p>
                    <p className="mt-0.5 text-[13px] whitespace-pre-wrap">{submission.internal_notes}</p>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Findings */}
          <Card>
            <CardHeader
              title="Automated Findings"
              description={`First-pass checks against configured policies for version ${viewed.version_number}. Not a legal determination.`}
              actions={usesDemoRules ? <DemoBadge /> : undefined}
            />
            {viewedRun ? (
              <>
                <div className="px-5 pt-4 pb-1">
                  <CheckSummary run={viewedRun} />
                </div>
                <FindingsList findings={viewedFindings} />
              </>
            ) : (
              <EmptyState
                title="Not checked yet"
                description="Run the automated check to see PASS, POTENTIAL ISSUE and REVIEW REQUIRED findings."
                action={editable && isCurrent && submission.status !== "changes_requested" && (
                  <RunCheckButton submissionId={id} variant="primary" />
                )}
              />
            )}
          </Card>

          {editable && (
            <Card>
              <CardHeader
                title={`Upload version ${versions[0]!.version_number + 1}`}
                description="Previous versions are kept unchanged. The new version starts as a draft and must be checked again."
              />
              <CardBody>
                <NewVersionForm
                  submissionId={id}
                  nextVersionNumber={versions[0]!.version_number + 1}
                  defaults={{
                    creativeText: current.creative_text,
                    destinationUrl: current.destination_url ?? "",
                  }}
                  currentImageName={current.creative_files[0]?.file_name ?? null}
                />
              </CardBody>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {canDecide && (
            <Card className="border-brand-500/40 ring-2 ring-brand-100">
              <CardHeader title="Compliance decision" description="Review the creative and findings, then decide." />
              <CardBody>
                <ReviewDecisionForm submissionId={id} versionId={current.id} versionNumber={current.version_number} />
              </CardBody>
            </Card>
          )}

          <Card>
            <CardHeader title="Details" />
            <CardBody>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
                <dt className="text-ink-subtle">Campaign</dt>
                <dd className="font-medium">{submission.campaign_name}</dd>
                <dt className="text-ink-subtle">Brand</dt>
                <dd className="font-medium">{submission.brand?.name}</dd>
                <dt className="text-ink-subtle">Jurisdiction</dt>
                <dd className="font-medium">{submission.jurisdiction?.name}</dd>
                <dt className="text-ink-subtle">Channel</dt>
                <dd className="font-medium">{CHANNEL_LABELS[submission.channel]}</dd>
                <dt className="text-ink-subtle">Status</dt>
                <dd><SubmissionStatusBadge status={submission.status} /></dd>
                <dt className="text-ink-subtle">Created by</dt>
                <dd className="font-medium">{submission.creator?.full_name || submission.creator?.email}</dd>
                <dt className="text-ink-subtle">Created</dt>
                <dd>{formatDateTime(submission.created_at)}</dd>
                <dt className="text-ink-subtle">Submitted</dt>
                <dd>{formatDateTime(submission.submitted_at)}</dd>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Version History" description={`${versions.length} version${versions.length === 1 ? "" : "s"}, never overwritten`} />
            <VersionHistory
              submissionId={id}
              versions={versionRows}
              currentVersionId={submission.current_version_id}
              viewedVersionId={viewed.id}
            />
          </Card>

          <Card>
            <CardHeader title="Review Comments" />
            {reviews.length === 0 ? (
              <p className="px-5 py-4 text-xs text-ink-subtle">No reviews or comments yet.</p>
            ) : (
              <ol className="divide-y divide-border" data-testid="review-comments">
                {reviews.map((r) => (
                  <li key={r.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium">{r.reviewer?.full_name || r.reviewer?.email}</p>
                      <DecisionBadge decision={r.decision} />
                    </div>
                    {r.comment && <p className="mt-1 text-[13px] whitespace-pre-wrap text-ink-muted">{r.comment}</p>}
                    <p className="mt-1 text-[11px] text-ink-subtle">
                      Version {r.version?.version_number} · {formatDateTime(r.created_at)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
            {(canEdit || can.review(member.role) || member.role === "admin") && (
              <CardBody className="border-t border-border">
                <CommentForm submissionId={id} />
              </CardBody>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <History className="size-4" aria-hidden /> Audit History
            </span>
          }
          description="Append-only record of every action on this submission. Entries cannot be edited or deleted."
        />
        {audit.length === 0 ? (
          <EmptyState title="No audit events" />
        ) : (
          <div data-testid="audit-history">
            <AuditFeed events={audit} showSubmission={false} />
          </div>
        )}
      </Card>
    </div>
  );
}
