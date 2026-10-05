import "server-only";
import { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export const SUBMISSION_LIST_SELECT =
  "id, campaign_name, channel, status, created_at, updated_at, submitted_at, decided_at, brand:brands(id, name), jurisdiction:jurisdictions(id, name, code), creator:profiles!submissions_created_by_fkey(full_name, email), current_version:submission_versions!submissions_current_version_fk(version_number)" as const;

export async function listSubmissions(
  supabase: Client,
  opts: { status?: string[]; limit?: number; search?: string; brandId?: string; orderBy?: "updated_at" | "submitted_at" } = {},
) {
  let query = supabase
    .from("submissions")
    .select(SUBMISSION_LIST_SELECT)
    .order(opts.orderBy ?? "updated_at", { ascending: opts.orderBy === "submitted_at" });
  if (opts.status?.length) query = query.in("status", opts.status as never);
  if (opts.brandId) query = query.eq("brand_id", opts.brandId);
  if (opts.search) query = query.ilike("campaign_name", `%${opts.search.replace(/[%_]/g, "")}%`);
  if (opts.limit) query = query.limit(opts.limit);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load submissions: ${error.message}`);
  return data;
}

export type SubmissionListItem = Awaited<ReturnType<typeof listSubmissions>>[number];

export async function listAuditEvents(
  supabase: Client,
  opts: { limit?: number; submissionId?: string; action?: string; before?: string; hideLogins?: boolean } = {},
) {
  let query = supabase
    .from("audit_events")
    .select("*, submission:submissions(id, campaign_name)")
    .order("created_at", { ascending: false });
  if (opts.submissionId) query = query.eq("submission_id", opts.submissionId);
  if (opts.action) query = query.like("action", `${opts.action}%`);
  if (opts.before) query = query.lt("created_at", opts.before);
  if (opts.hideLogins) query = query.neq("action", "user.logged_in");
  query = query.limit(opts.limit ?? 50);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load audit events: ${error.message}`);
  return data;
}

export type AuditEventItem = Awaited<ReturnType<typeof listAuditEvents>>[number];
