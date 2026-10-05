import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildApprovalSnapshot } from "../../src/lib/approval";
import { runAndStoreCheck } from "../../src/lib/compliance/run-check";
import { DECISION_LABELS, OUTCOME_LABELS } from "../../src/lib/constants";
import type { Database, Json } from "../../src/lib/supabase/database.types";
import type { Submission, SubmissionStatus, SubmissionVersion } from "../../src/lib/types";
import { DEMO_SUBMISSIONS } from "./submissions";

type Db = SupabaseClient<Database>;
type Person = { id: string; email: string };

const IMAGES = path.join(__dirname, "images");

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function ok<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error || res.data === null || res.data === undefined) {
    throw new Error(`${what}: ${res.error?.message ?? "no data"}`);
  }
  return res.data;
}

export async function seedSubmissions(
  db: Db,
  ctx: {
    orgId: string;
    marketing: Person;
    compliance: Person;
    brands: Map<string, { id: string; name: string }>;
    jurisdictions: Map<string, { id: string; code: string }>;
  },
) {
  for (const def of DEMO_SUBMISSIONS) {
    const brand = ctx.brands.get(def.brand)!;
    const jurisdiction = ctx.jurisdictions.get(def.jurisdiction)!;

    const audit = async (
      actor: Person,
      at: number,
      action: string,
      description: string,
      extra: { entityType: string; entityId: string; metadata?: Record<string, Json> },
    ) => {
      ok(
        await db
          .from("audit_events")
          .insert({
            organization_id: ctx.orgId,
            actor_id: actor.id,
            actor_email: actor.email,
            action,
            entity_type: extra.entityType,
            entity_id: extra.entityId,
            submission_id: submission.id,
            description,
            metadata: extra.metadata ?? {},
            created_at: hoursAgo(at),
          })
          .select("id"),
        `audit ${action}`,
      );
    };

    let submission: Submission = ok(
      await db
        .from("submissions")
        .insert({
          organization_id: ctx.orgId,
          campaign_name: def.campaign,
          brand_id: brand.id,
          jurisdiction_id: jurisdiction.id,
          channel: def.channel,
          internal_notes: def.notes ?? "",
          created_by: ctx.marketing.id,
          created_at: hoursAgo(def.createdAt),
        })
        .select("*")
        .single(),
      `submission ${def.campaign}`,
    );
    await audit(ctx.marketing, def.createdAt, "submission.created", `Created submission "${def.campaign}" (${brand.name}, ${jurisdiction.code})`, {
      entityType: "submission",
      entityId: submission.id,
      metadata: { brand: brand.name, jurisdiction: jurisdiction.code, channel: def.channel },
    });

    const update = async (patch: Partial<Submission>) => {
      submission = ok(
        await db.from("submissions").update(patch).eq("id", submission.id).select("*").single(),
        "update submission",
      );
    };

    let version: SubmissionVersion | null = null;
    let hasImage = false;
    let versionNumber = 0;
    let lastRunId: string | null = null;

    for (const step of def.steps) {
      switch (step.type) {
        case "version": {
          versionNumber += 1;
          version = ok(
            await db
              .from("submission_versions")
              .insert({
                organization_id: ctx.orgId,
                submission_id: submission.id,
                version_number: versionNumber,
                creative_text: step.text,
                destination_url: step.url ?? null,
                change_note: step.note ?? (versionNumber === 1 ? "Initial version" : ""),
                created_by: ctx.marketing.id,
                created_at: hoursAgo(step.at),
              })
              .select("*")
              .single(),
            "version",
          );
          hasImage = Boolean(step.image);
          if (step.image) {
            const bytes = fs.readFileSync(path.join(IMAGES, step.image));
            const storagePath = `${ctx.orgId}/submissions/${submission.id}/v${versionNumber}/${randomUUID()}.png`;
            const up = await db.storage.from("creatives").upload(storagePath, bytes, { contentType: "image/png" });
            if (up.error) throw new Error(`upload ${step.image}: ${up.error.message}`);
            ok(
              await db
                .from("creative_files")
                .insert({
                  organization_id: ctx.orgId,
                  submission_id: submission.id,
                  version_id: version.id,
                  storage_path: storagePath,
                  file_name: step.image,
                  mime_type: "image/png",
                  size_bytes: bytes.length,
                  created_by: ctx.marketing.id,
                  created_at: hoursAgo(step.at),
                })
                .select("id"),
              "creative file",
            );
          }
          await update({ current_version_id: version.id, status: "draft" });
          await audit(ctx.marketing, step.at, "version.uploaded", `Uploaded version ${versionNumber}${step.note ? `: ${step.note}` : hasImage ? " with image" : ""}`, {
            entityType: "submission_version",
            entityId: version.id,
            metadata: { version_number: versionNumber, has_image: hasImage },
          });
          break;
        }
        case "check": {
          const run = await runAndStoreCheck(db, {
            submission,
            version: version!,
            brandName: brand.name,
            jurisdictionCode: jurisdiction.code,
            hasImage,
            runBy: ctx.marketing.id,
            createdAt: hoursAgo(step.at),
          });
          lastRunId = run.id;
          await update({ status: "checked" });
          await audit(
            ctx.marketing,
            step.at,
            "check.run",
            `Ran automated check on version ${versionNumber}: ${OUTCOME_LABELS[run.outcome]} (${run.potential_issue_count} potential issues, ${run.review_required_count} review required, ${run.pass_count} pass)`,
            { entityType: "check_run", entityId: run.id, metadata: { outcome: run.outcome, version_number: versionNumber } },
          );
          break;
        }
        case "submit": {
          await update({ status: "pending_review", submitted_at: hoursAgo(step.at) });
          await audit(ctx.marketing, step.at, "submission.submitted", `Submitted version ${versionNumber} for compliance review`, {
            entityType: "submission",
            entityId: submission.id,
            metadata: { version_number: versionNumber },
          });
          break;
        }
        case "open": {
          await audit(ctx.compliance, step.at, "review.opened", `Opened version ${versionNumber} for review`, {
            entityType: "submission_version",
            entityId: version!.id,
            metadata: { version_number: versionNumber },
          });
          break;
        }
        case "comment": {
          const author = step.by === "marketing" ? ctx.marketing : ctx.compliance;
          const review = ok(
            await db
              .from("reviews")
              .insert({
                organization_id: ctx.orgId,
                submission_id: submission.id,
                version_id: version!.id,
                reviewer_id: author.id,
                decision: "comment",
                comment: step.comment,
                created_at: hoursAgo(step.at),
              })
              .select("id")
              .single(),
            "comment",
          );
          await audit(author, step.at, "review.comment", `Commented: “${step.comment}”`, { entityType: "review", entityId: review.id });
          break;
        }
        case "review": {
          const at = hoursAgo(step.at);
          const review = ok(
            await db
              .from("reviews")
              .insert({
                organization_id: ctx.orgId,
                submission_id: submission.id,
                version_id: version!.id,
                reviewer_id: ctx.compliance.id,
                decision: step.decision,
                comment: step.comment,
                created_at: at,
              })
              .select("*")
              .single(),
            "review",
          );
          await update({ status: step.decision as SubmissionStatus, decided_at: at });
          await audit(ctx.compliance, step.at, `review.${step.decision}`, `${DECISION_LABELS[step.decision]} version ${versionNumber}: “${step.comment}”`, {
            entityType: "review",
            entityId: review.id,
            metadata: { decision: step.decision, version_number: versionNumber },
          });
          if (step.decision === "approved") {
            const snapshot = await buildApprovalSnapshot(db, {
              submissionId: submission.id,
              versionId: version!.id,
              checkRunId: lastRunId!,
              reviewId: review.id,
              approvedAt: at,
            });
            const code = `APR-${at.slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
            const record = ok(
              await db
                .from("approval_records")
                .insert({
                  organization_id: ctx.orgId,
                  submission_id: submission.id,
                  version_id: version!.id,
                  review_id: review.id,
                  reference_code: code,
                  approved_by: ctx.compliance.id,
                  approved_at: at,
                  snapshot: snapshot as unknown as { [key: string]: Json },
                })
                .select("id")
                .single(),
              "approval record",
            );
            await audit(ctx.compliance, step.at, "approval_record.created", `Generated approval record ${code}`, {
              entityType: "approval_record",
              entityId: record.id,
              metadata: { reference_code: code },
            });
          }
          break;
        }
      }
    }
    // Keep updated_at aligned with the last activity, not the seed time.
    const lastAt = Math.min(...def.steps.map((s) => s.at));
    await update({ updated_at: hoursAgo(lastAt) });
    console.log(`  ${def.campaign.padEnd(32)} ${submission.status} (v${versionNumber})`);
  }
}
