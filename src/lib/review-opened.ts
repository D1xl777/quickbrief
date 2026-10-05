import "server-only";
import type { CurrentMember } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Records "Reviewer opened submission" the first time a compliance reviewer opens
 * a version that is waiting for review. Called while rendering the detail page,
 * after the page has already loaded the submission through RLS.
 */
export async function recordReviewOpened(
  member: CurrentMember,
  submission: { id: string; campaign_name: string },
  version: { id: string; version_number: number },
) {
  const admin = createAdminClient();
  const { data: existing, error } = await admin
    .from("audit_events")
    .select("id")
    .eq("organization_id", member.organization.id)
    .eq("submission_id", submission.id)
    .eq("actor_id", member.userId)
    .eq("action", "review.opened")
    .eq("entity_id", version.id)
    .limit(1);
  if (error) {
    console.error("Could not check review-opened events", error);
    return;
  }
  if (existing.length > 0) return;
  await recordAudit(admin, member, {
    action: "review.opened",
    entityType: "submission_version",
    entityId: version.id,
    submissionId: submission.id,
    description: `Opened version ${version.version_number} for review`,
    metadata: { version_number: version.version_number },
  });
}
