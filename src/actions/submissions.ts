"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { can, PermissionError, requireMember, type CurrentMember } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { check, formString, toActionError, UserFacingError } from "@/lib/action-utils";
import { runAndStoreCheck } from "@/lib/compliance/run-check";
import { ALLOWED_IMAGE_TYPES, CHANNELS, MAX_UPLOAD_BYTES, OUTCOME_LABELS } from "@/lib/constants";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult, Channel, Submission, SubmissionStatus, SubmissionVersion } from "@/lib/types";
import { uuid } from "@/lib/validation";

type Admin = ReturnType<typeof createAdminClient>;
type Intent = "save" | "check" | "submit";

const BUCKET = "creatives";
/** Statuses in which marketing may upload a new version. */
const EDITABLE: SubmissionStatus[] = ["draft", "checked", "changes_requested"];

const urlField = z
  .string()
  .trim()
  .max(2000)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "URL must start with http:// or https://")
  .refine((v) => {
    if (v === "") return true;
    try {
      new URL(v);
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid URL.")
  .transform((v) => (v === "" ? null : v));

const creativeSchema = z.object({
  creative_text: z.string().trim().max(20000, "Creative text is too long."),
  destination_url: urlField,
});

const newSubmissionSchema = creativeSchema.extend({
  campaign_name: z.string().trim().min(1, "Campaign name is required.").max(200),
  brand_id: uuid,
  jurisdiction_id: uuid,
  channel: z.enum(CHANNELS as [Channel, ...Channel[]], { message: "Choose a channel." }),
  internal_notes: z.string().trim().max(5000),
});

function parseIntent(formData: FormData): Intent {
  const v = formString(formData, "intent");
  return v === "check" || v === "submit" ? v : "save";
}

function getImage(formData: FormData): File | null {
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new UserFacingError("Image must be a PNG, JPEG, WebP or GIF file.");
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new UserFacingError("Image must be 4 MB or smaller.");
  return file;
}

function storagePath(orgId: string, submissionId: string, versionNumber: number, fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  return `${orgId}/submissions/${submissionId}/v${versionNumber}/${randomUUID()}.${ext}`;
}

async function uploadImage(admin: Admin, path: string, file: File) {
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("Creative upload failed", error);
    throw new UserFacingError("Could not upload the image. Please try again.");
  }
}

/** Loads a submission of the caller's organisation and checks they may change it. */
async function loadOwnSubmission(admin: Admin, member: CurrentMember, submissionId: string) {
  if (!can.createSubmissions(member.role)) throw new PermissionError();
  const submission = check(
    await admin
      .from("submissions")
      .select("*, brand:brands(name), jurisdiction:jurisdictions(code)")
      .eq("id", submissionId)
      .eq("organization_id", member.organization.id)
      .maybeSingle(),
    "load the submission",
  );
  if (member.role === "marketing" && submission.created_by !== member.userId) {
    throw new PermissionError("You can only change your own submissions.");
  }
  return submission;
}

async function loadCurrentVersion(admin: Admin, submission: Submission) {
  if (!submission.current_version_id) throw new UserFacingError("This submission has no version yet.");
  return check(
    await admin
      .from("submission_versions")
      .select("*")
      .eq("id", submission.current_version_id)
      .single(),
    "load the current version",
  );
}

async function setStatus(
  admin: Admin,
  submissionId: string,
  from: SubmissionStatus[],
  patch: Partial<Submission> & { status: SubmissionStatus },
) {
  // The status filter makes the transition atomic: a concurrent change fails.
  const { data, error } = await admin
    .from("submissions")
    .update(patch)
    .eq("id", submissionId)
    .in("status", from)
    .select("id");
  if (error) throw new UserFacingError("Could not update the submission status.");
  if (!data || data.length === 0) {
    throw new UserFacingError("This submission changed in the meantime. Refresh and try again.");
  }
}

async function performCheck(
  admin: Admin,
  member: CurrentMember,
  submission: Submission & { brand: { name: string } | null; jurisdiction: { code: string } | null },
  version: SubmissionVersion,
) {
  const { count } = await admin
    .from("creative_files")
    .select("id", { count: "exact", head: true })
    .eq("version_id", version.id);

  const run = await runAndStoreCheck(admin, {
    submission,
    version,
    brandName: submission.brand?.name ?? "",
    jurisdictionCode: submission.jurisdiction?.code ?? "",
    hasImage: (count ?? 0) > 0,
    runBy: member.userId,
    aiProviderName: serverEnv.aiProvider(),
  });

  await setStatus(admin, submission.id, ["draft", "checked"], { status: "checked" });
  await recordAudit(admin, member, {
    action: "check.run",
    entityType: "check_run",
    entityId: run.id,
    submissionId: submission.id,
    description: `Ran automated check on version ${version.version_number}: ${OUTCOME_LABELS[run.outcome]} (${run.potential_issue_count} potential issues, ${run.review_required_count} review required, ${run.pass_count} pass)`,
    metadata: {
      version_number: version.version_number,
      outcome: run.outcome,
      potential_issue_count: run.potential_issue_count,
      review_required_count: run.review_required_count,
      pass_count: run.pass_count,
    },
  });
  return run;
}

async function performSubmit(admin: Admin, member: CurrentMember, submission: Submission, version: SubmissionVersion) {
  const { data: latestRun } = await admin
    .from("check_runs")
    .select("id")
    .eq("version_id", version.id)
    .limit(1)
    .maybeSingle();
  if (!latestRun) {
    throw new UserFacingError("Run the automated check on the current version before submitting.");
  }
  await setStatus(admin, submission.id, ["checked"], {
    status: "pending_review",
    submitted_at: new Date().toISOString(),
  });
  await recordAudit(admin, member, {
    action: "submission.submitted",
    entityType: "submission",
    entityId: submission.id,
    submissionId: submission.id,
    description: `Submitted version ${version.version_number} for compliance review`,
    metadata: { version_number: version.version_number },
  });
}

// ---------------------------------------------------------------------------

export async function createSubmission(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  let submissionId: string;
  const intent = parseIntent(formData);
  try {
    const member = await requireMember();
    if (!can.createSubmissions(member.role)) throw new PermissionError();
    const input = newSubmissionSchema.parse({
      campaign_name: formString(formData, "campaign_name"),
      brand_id: formString(formData, "brand_id"),
      jurisdiction_id: formString(formData, "jurisdiction_id"),
      channel: formString(formData, "channel"),
      creative_text: formString(formData, "creative_text"),
      destination_url: formString(formData, "destination_url"),
      internal_notes: formString(formData, "internal_notes"),
    });
    const image = getImage(formData);
    if (!input.creative_text && !image) {
      throw new UserFacingError("Add creative text, an image, or both.");
    }

    const admin = createAdminClient();
    const orgId = member.organization.id;

    const brand = check(
      await admin
        .from("brands")
        .select("id, name, status, brand_jurisdictions(jurisdiction_id)")
        .eq("id", input.brand_id)
        .eq("organization_id", orgId)
        .maybeSingle(),
      "find the brand",
    );
    if (brand.status !== "active") throw new UserFacingError(`${brand.name} is inactive.`);
    const jurisdiction = check(
      await admin
        .from("jurisdictions")
        .select("id, name, code, is_active")
        .eq("id", input.jurisdiction_id)
        .eq("organization_id", orgId)
        .maybeSingle(),
      "find the jurisdiction",
    );
    if (!jurisdiction.is_active) throw new UserFacingError(`${jurisdiction.name} is inactive.`);
    if (!brand.brand_jurisdictions.some((bj) => bj.jurisdiction_id === jurisdiction.id)) {
      throw new UserFacingError(`${brand.name} is not active in ${jurisdiction.name}.`);
    }

    const submission = check(
      await admin
        .from("submissions")
        .insert({
          organization_id: orgId,
          campaign_name: input.campaign_name,
          brand_id: brand.id,
          jurisdiction_id: jurisdiction.id,
          channel: input.channel,
          internal_notes: input.internal_notes,
          created_by: member.userId,
        })
        .select("*")
        .single(),
      "create the submission",
    );
    submissionId = submission.id;

    // Upload first, so a failed upload leaves no half-created version behind.
    let path: string | null = null;
    try {
      if (image) {
        path = storagePath(orgId, submission.id, 1, image.name);
        await uploadImage(admin, path, image);
      }
    } catch (err) {
      await admin.from("submissions").delete().eq("id", submission.id);
      throw err;
    }

    const versionResult = await admin
      .from("submission_versions")
      .insert({
        organization_id: orgId,
        submission_id: submission.id,
        version_number: 1,
        creative_text: input.creative_text,
        destination_url: input.destination_url,
        change_note: "Initial version",
        created_by: member.userId,
      })
      .select("*")
      .single();
    if (versionResult.error || !versionResult.data) {
      // Nothing was recorded for this submission yet, so it is safe to roll back.
      await admin.from("submissions").delete().eq("id", submission.id);
      if (path) await admin.storage.from(BUCKET).remove([path]);
      console.error("Version insert failed", versionResult.error);
      throw new UserFacingError("Could not save the creative. Please try again.");
    }
    const version = versionResult.data;
    if (image && path) {
      check(
        await admin
          .from("creative_files")
          .insert({
            organization_id: orgId,
            submission_id: submission.id,
            version_id: version.id,
            storage_path: path,
            file_name: image.name.slice(0, 255),
            mime_type: image.type,
            size_bytes: image.size,
            created_by: member.userId,
          })
          .select("id")
          .single(),
        "save the image record",
      );
    }
    const updated = check(
      await admin
        .from("submissions")
        .update({ current_version_id: version.id })
        .eq("id", submission.id)
        .select("*")
        .single(),
      "link the version",
    );

    await recordAudit(admin, member, {
      action: "submission.created",
      entityType: "submission",
      entityId: submission.id,
      submissionId: submission.id,
      description: `Created submission "${input.campaign_name}" (${brand.name}, ${jurisdiction.name})`,
      metadata: { brand: brand.name, jurisdiction: jurisdiction.code, channel: input.channel },
    });
    await recordAudit(admin, member, {
      action: "version.uploaded",
      entityType: "submission_version",
      entityId: version.id,
      submissionId: submission.id,
      description: `Uploaded version 1${image ? " with image" : ""}`,
      metadata: { version_number: 1, has_image: Boolean(image) },
    });

    if (intent !== "save") {
      const full = { ...updated, brand: { name: brand.name }, jurisdiction: { code: jurisdiction.code } };
      await performCheck(admin, member, full, version);
      if (intent === "submit") await performSubmit(admin, member, updated, version);
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/submissions");
  revalidatePath("/dashboard");
  redirect(`/submissions/${submissionId}`);
}

export async function createVersion(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const intent = parseIntent(formData);
  let submissionId: string;
  try {
    const member = await requireMember();
    submissionId = uuid.parse(formString(formData, "submission_id"));
    const admin = createAdminClient();
    const submission = await loadOwnSubmission(admin, member, submissionId);
    if (!EDITABLE.includes(submission.status)) {
      throw new UserFacingError("A new version can only be uploaded before review or after changes were requested.");
    }
    const input = creativeSchema.parse({
      creative_text: formString(formData, "creative_text"),
      destination_url: formString(formData, "destination_url"),
    });
    const changeNote = z.string().trim().max(2000).parse(formString(formData, "change_note"));
    const image = getImage(formData);
    const keepImage = formString(formData, "keep_image") === "on";

    const current = await loadCurrentVersion(admin, submission);
    const { data: currentFile } = await admin
      .from("creative_files")
      .select("*")
      .eq("version_id", current.id)
      .limit(1)
      .maybeSingle();

    const willHaveImage = Boolean(image) || (keepImage && Boolean(currentFile));
    if (!input.creative_text && !willHaveImage) {
      throw new UserFacingError("Add creative text, an image, or both.");
    }

    const { data: last } = await admin
      .from("submission_versions")
      .select("version_number")
      .eq("submission_id", submission.id)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();
    const nextNumber = (last?.version_number ?? 0) + 1;
    const orgId = member.organization.id;

    // Store the image for this version. Old files are never touched: a kept image
    // is copied, so every version owns its own immutable file.
    let file: { path: string; name: string; type: string; size: number } | null = null;
    if (image) {
      const path = storagePath(orgId, submission.id, nextNumber, image.name);
      await uploadImage(admin, path, image);
      file = { path, name: image.name.slice(0, 255), type: image.type, size: image.size };
    } else if (keepImage && currentFile) {
      const path = storagePath(orgId, submission.id, nextNumber, currentFile.file_name);
      const { error } = await admin.storage.from(BUCKET).copy(currentFile.storage_path, path);
      if (error) {
        console.error("Copying creative failed", error);
        throw new UserFacingError("Could not carry over the current image. Please upload it again.");
      }
      file = { path, name: currentFile.file_name, type: currentFile.mime_type, size: currentFile.size_bytes };
    }

    const { data: version, error: vErr } = await admin
      .from("submission_versions")
      .insert({
        organization_id: orgId,
        submission_id: submission.id,
        version_number: nextNumber,
        creative_text: input.creative_text,
        destination_url: input.destination_url,
        change_note: changeNote,
        created_by: member.userId,
      })
      .select("*")
      .single();
    if (vErr?.code === "23505") {
      throw new UserFacingError("Another version was uploaded at the same time. Refresh and try again.");
    }
    if (vErr || !version) throw new UserFacingError("Could not save the new version.");

    if (file) {
      check(
        await admin
          .from("creative_files")
          .insert({
            organization_id: orgId,
            submission_id: submission.id,
            version_id: version.id,
            storage_path: file.path,
            file_name: file.name,
            mime_type: file.type,
            size_bytes: file.size,
            created_by: member.userId,
          })
          .select("id")
          .single(),
        "save the image record",
      );
    }

    const { data: moved, error: mErr } = await admin
      .from("submissions")
      .update({ current_version_id: version.id, status: "draft" })
      .eq("id", submission.id)
      .in("status", EDITABLE)
      .select("*")
      .single();
    if (mErr || !moved) throw new UserFacingError("This submission changed in the meantime. Refresh and try again.");

    await recordAudit(admin, member, {
      action: "version.uploaded",
      entityType: "submission_version",
      entityId: version.id,
      submissionId: submission.id,
      description: `Uploaded version ${nextNumber}${changeNote ? `: ${changeNote}` : ""}`,
      metadata: {
        version_number: nextNumber,
        previous_status: submission.status,
        has_image: Boolean(file),
        image_carried_over: !image && Boolean(file),
      },
    });

    if (intent !== "save") {
      await performCheck(admin, member, { ...moved, brand: submission.brand, jurisdiction: submission.jurisdiction }, version);
      if (intent === "submit") await performSubmit(admin, member, moved, version);
    }
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath(`/submissions/${submissionId}`);
  redirect(`/submissions/${submissionId}`);
}

export async function runCheck(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireMember();
    const submissionId = uuid.parse(formString(formData, "submission_id"));
    const admin = createAdminClient();
    const submission = await loadOwnSubmission(admin, member, submissionId);
    if (submission.status === "changes_requested") {
      throw new UserFacingError("Changes were requested. Upload a new version before re-checking.");
    }
    if (!["draft", "checked"].includes(submission.status)) {
      throw new UserFacingError("Checks can only be run before the submission is sent for review.");
    }
    const version = await loadCurrentVersion(admin, submission);
    const run = await performCheck(admin, member, submission, version);
    revalidatePath(`/submissions/${submissionId}`);
    return { ok: true, message: run.summary };
  } catch (err) {
    return toActionError(err);
  }
}

export async function submitForReview(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireMember();
    const submissionId = uuid.parse(formString(formData, "submission_id"));
    const admin = createAdminClient();
    const submission = await loadOwnSubmission(admin, member, submissionId);
    if (submission.status !== "checked") {
      throw new UserFacingError(
        submission.status === "draft"
          ? "Run the automated check on the current version before submitting."
          : "This submission cannot be submitted in its current status.",
      );
    }
    const version = await loadCurrentVersion(admin, submission);
    await performSubmit(admin, member, submission, version);
    revalidatePath(`/submissions/${submissionId}`);
    revalidatePath("/review-queue");
    return { ok: true, message: "Submitted for compliance review." };
  } catch (err) {
    return toActionError(err);
  }
}
