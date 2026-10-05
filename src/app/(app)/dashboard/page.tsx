import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, FileStack, Plus } from "lucide-react";
import { AuditFeed } from "@/components/audit-feed";
import { SubmissionsTable } from "@/components/submissions-table";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { can, requirePageMember } from "@/lib/auth";
import { listAuditEvents, listSubmissions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { SubmissionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

function startOfMonthUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const member = await requirePageMember();
  const params = await props.searchParams;
  const supabase = await createClient();

  const countBy = async (status: SubmissionStatus, since?: string) => {
    let q = supabase.from("submissions").select("id", { count: "exact", head: true }).eq("status", status);
    if (since) q = q.gte("decided_at", since);
    const { count, error } = await q;
    if (error) throw new Error(`Could not load dashboard counts: ${error.message}`);
    return count ?? 0;
  };

  const [pending, changes, approvedMonth, rejected, recent, activity] = await Promise.all([
    countBy("pending_review"),
    countBy("changes_requested"),
    countBy("approved", startOfMonthUtc()),
    countBy("rejected"),
    listSubmissions(supabase, { limit: 6 }),
    listAuditEvents(supabase, { limit: 8 }),
  ]);

  const stats = [
    { label: "Pending Reviews", value: pending, href: "/submissions?status=pending_review", accent: "bg-violet-500" },
    { label: "Changes Requested", value: changes, href: "/submissions?status=changes_requested", accent: "bg-amber-500" },
    { label: "Approved This Month", value: approvedMonth, href: "/submissions?status=approved", accent: "bg-emerald-500" },
    { label: "Rejected", value: rejected, href: "/submissions?status=rejected", accent: "bg-red-500" },
  ];

  const firstName = member.profile.full_name.split(" ")[0] || member.email;

  return (
    <div className="space-y-6">
      {params.error === "forbidden" && (
        <Alert tone="error">You do not have access to that page.</Alert>
      )}
      <PageHeader
        title={`Good to see you, ${firstName}`}
        description={
          member.role === "marketing"
            ? "Your creative submissions and their compliance status."
            : "Overview of creative submissions and compliance activity across your organisation."
        }
        actions={
          <>
            {can.review(member.role) && (
              <ButtonLink href="/review-queue" variant="secondary">
                <ClipboardCheck className="size-4" aria-hidden /> Open review queue
              </ButtonLink>
            )}
            {can.createSubmissions(member.role) && (
              <ButtonLink href="/submissions/new">
                <Plus className="size-4" aria-hidden /> New submission
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group">
            <Card className="relative overflow-hidden p-5 transition-colors group-hover:border-border-strong">
              <span className={`absolute inset-y-0 left-0 w-1 ${s.accent}`} aria-hidden />
              <p className="text-xs font-medium text-ink-subtle">{s.label}</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-ink" data-testid={`stat-${s.label}`}>
                {s.value}
              </p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent submissions"
            actions={
              <Link href="/submissions" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                View all
              </Link>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              icon={FileStack}
              title="No submissions yet"
              description="Submissions appear here once marketing uploads a creative."
              action={
                can.createSubmissions(member.role) && (
                  <ButtonLink href="/submissions/new">Create the first submission</ButtonLink>
                )
              }
            />
          ) : (
            <SubmissionsTable submissions={recent} showCreator={member.role !== "marketing"} />
          )}
        </Card>
        <Card>
          <CardHeader
            title="Recent audit activity"
            actions={
              can.viewAuditLog(member.role) && (
                <Link href="/audit-log" className="text-xs font-medium text-brand-600 hover:text-brand-700">
                  Full log
                </Link>
              )
            }
          />
          {activity.length === 0 ? (
            <EmptyState title="No activity yet" />
          ) : (
            <AuditFeed events={activity} compact />
          )}
        </Card>
      </div>
    </div>
  );
}
