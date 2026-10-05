import "server-only";
import type { CurrentMember } from "@/lib/auth";
import type { Json } from "@/lib/supabase/database.types";
import type { createAdminClient } from "@/lib/supabase/admin";

export type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  submissionId?: string | null;
  description: string;
  metadata?: Record<string, Json | undefined>;
};

/**
 * Appends an audit event. Audit events are append-only in the database
 * (updates/deletes are rejected by a trigger). Throws on failure so that an
 * action is never reported as successful without its audit trail.
 */
export async function recordAudit(
  admin: ReturnType<typeof createAdminClient>,
  member: CurrentMember,
  input: AuditInput,
) {
  const { error } = await admin.from("audit_events").insert({
    organization_id: member.organization.id,
    actor_id: member.userId,
    actor_email: member.email,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    submission_id: input.submissionId ?? null,
    description: input.description,
    metadata: input.metadata ?? {},
  });
  if (error) throw new Error(`Could not write audit event: ${error.message}`);
}
