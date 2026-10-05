"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { can, PermissionError, requireMember } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { check, formString, toActionError, UserFacingError } from "@/lib/action-utils";
import { buildApprovalSnapshot } from "@/lib/approval";
import { DECISION_LABELS } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { ActionResult } from "@/lib/types";
import { uuid } from "@/lib/validation";

const decisionSchema = z
  .object({
    submission_id: uuid,
    version_id: uuid,
    decision: z.enum(["approved", "changes_requested", "rejected"], {
      message: "Choose a decision.",
    }),
    comment: z.string().trim().max(5000, "Comment is too long."),
  })
  .refine((d) => d.decision === "approved" || d.comment.length > 0, {
    message: "A comment is required when requesting changes or rejecting.",
    path: ["comment"],
  });

function referenceCode(date = new Date()) {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  return `APR-${ymd}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function reviewSubmission(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireMember();
    if (!can.review(member.role)) {
      throw new PermissionError("Only Compliance Reviewers can make review decisions.");
    }
    const input = decisionSchema.parse({
      submission_id: formString(formData, "submission_id"),
      version_id: formString(formData, "version_id"),
      decision: formString(formData, "decision"),
      comment: formString(formData, "comment"),
    });
    const admin = createAdminClient();
    const orgId = member.organization.id;

    const submission = check(
      await admin
        .from("submissions")
        .select("*")
        .eq("id", input.submission_id)
        .eq("organization_id", orgId)
        .maybeSingle(),
      "load the submission",
    );
    if (submission.status !== "pending_review") {
      throw new UserFacingError("This submission is not waiting for review.");
    }
    if (submission.current_version_id !== input.version_id) {
      throw new UserFacingError("A newer version exists. Refresh the page and review the current version.");
    }
    if (submission.created_by === member.userId) {
      throw new PermissionError("You cannot review a submission you created.");
    }

    const version = check(
      await admin.from("submission_versions").select("*").eq("id", input.version_id).single(),
      "load the version",
    );
    const { data: latestRun } = await admin
      .from("check_runs")
      .select("id")
      .eq("version_id", version.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latestRun) throw new UserFacingError("This version has no automated check results.");

    const review = check(
      await admin
        .from("reviews")
        .insert({
          organization_id: orgId,
          submission_id: submission.id,
          version_id: version.id,
          reviewer_id: member.userId,
          decision: input.decision,
          comment: input.comment,
        })
        .select("*")
        .single(),
      "record the review",
    );

    const now = new Date().toISOString();
    const { data: moved, error: moveError } = await admin
      .from("submissions")
      .update({ status: input.decision, decided_at: now })
      .eq("id", submission.id)
      .eq("status", "pending_review")
      .select("id");
    if (moveError || !moved?.length) {
      throw new UserFacingError("This submission changed in the meantime. Refresh and try again.");
    }

    await recordAudit(admin, member, {
      action: `review.${input.decision}`,
      entityType: "review",
      entityId: review.id,
      submissionId: submission.id,
      description: `${DECISION_LABELS[input.decision]} version ${version.version_number}${input.comment ? `: “${input.comment.slice(0, 200)}”` : ""}`,
      metadata: { version_number: version.version_number, decision: input.decision, check_run_id: latestRun.id },
    });

    if (input.decision === "approved") {
      const snapshot = await buildApprovalSnapshot(admin, {
        submissionId: submission.id,
        versionId: version.id,
        checkRunId: latestRun.id,
        reviewId: review.id,
        approvedAt: review.created_at,
      });
      const record = check(
        await admin
          .from("approval_records")
          .insert({
            organization_id: orgId,
            submission_id: submission.id,
            version_id: version.id,
            review_id: review.id,
            reference_code: referenceCode(new Date(review.created_at)),
            approved_by: member.userId,
            approved_at: review.created_at,
            snapshot: snapshot as unknown as { [key: string]: Json },
          })
          .select("id, reference_code")
          .single(),
        "create the approval record",
      );
      await recordAudit(admin, member, {
        action: "approval_record.created",
        entityType: "approval_record",
        entityId: record.id,
        submissionId: submission.id,
        description: `Generated approval record ${record.reference_code}`,
        metadata: { reference_code: record.reference_code, version_number: version.version_number },
      });
    }

    revalidatePath(`/submissions/${submission.id}`);
    revalidatePath("/review-queue");
    revalidatePath("/dashboard");
    return { ok: true, message: `Decision recorded: ${DECISION_LABELS[input.decision]}.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function addComment(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireMember();
    const submissionId = uuid.parse(formString(formData, "submission_id"));
    const comment = z
      .string()
      .trim()
      .min(1, "Write a comment first.")
      .max(5000, "Comment is too long.")
      .parse(formString(formData, "comment"));
    const admin = createAdminClient();
    const submission = check(
      await admin
        .from("submissions")
        .select("id, created_by, current_version_id")
        .eq("id", submissionId)
        .eq("organization_id", member.organization.id)
        .maybeSingle(),
      "load the submission",
    );
    if (member.role === "marketing" && submission.created_by !== member.userId) {
      throw new PermissionError();
    }
    if (!submission.current_version_id) throw new UserFacingError("This submission has no version yet.");

    const review = check(
      await admin
        .from("reviews")
        .insert({
          organization_id: member.organization.id,
          submission_id: submission.id,
          version_id: submission.current_version_id,
          reviewer_id: member.userId,
          decision: "comment",
          comment,
        })
        .select("id")
        .single(),
      "save the comment",
    );
    await recordAudit(admin, member, {
      action: "review.comment",
      entityType: "review",
      entityId: review.id,
      submissionId: submission.id,
      description: `Commented: “${comment.slice(0, 200)}”`,
    });
    revalidatePath(`/submissions/${submission.id}`);
    return { ok: true, message: "Comment added." };
  } catch (err) {
    return toActionError(err);
  }
}
