import type { Metadata } from "next";
import Link from "next/link";
import { FileStack, Plus } from "lucide-react";
import { SubmissionsTable } from "@/components/submissions-table";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/form";
import { PageHeader } from "@/components/ui/page-header";
import { can, requirePageMember } from "@/lib/auth";
import { SUBMISSION_STATUS_LABELS } from "@/lib/constants";
import { listSubmissions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { SubmissionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Submissions" };

const STATUSES = Object.keys(SUBMISSION_STATUS_LABELS) as SubmissionStatus[];

export default async function SubmissionsPage(props: PageProps<"/submissions">) {
  const member = await requirePageMember();
  const params = await props.searchParams;
  const status = typeof params.status === "string" && STATUSES.includes(params.status as SubmissionStatus)
    ? (params.status as SubmissionStatus)
    : undefined;
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";

  const supabase = await createClient();
  const submissions = await listSubmissions(supabase, {
    status: status ? [status] : undefined,
    search: q || undefined,
    limit: 200,
  });

  const filterHref = (s?: SubmissionStatus) => {
    const sp = new URLSearchParams();
    if (s) sp.set("status", s);
    if (q) sp.set("q", q);
    const str = sp.toString();
    return str ? `/submissions?${str}` : "/submissions";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Submissions"
        description={
          member.role === "marketing"
            ? "Creatives you have submitted, with every version and decision."
            : "All creatives submitted in your organisation."
        }
        actions={
          can.createSubmissions(member.role) && (
            <ButtonLink href="/submissions/new">
              <Plus className="size-4" aria-hidden /> New submission
            </ButtonLink>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          {[undefined, ...STATUSES].map((s) => (
            <Link
              key={s ?? "all"}
              href={filterHref(s)}
              className={cn(
                buttonClasses("ghost", "sm"),
                status === s && "bg-zinc-200/70 text-ink",
              )}
              aria-current={status === s ? "page" : undefined}
            >
              {s ? SUBMISSION_STATUS_LABELS[s] : "All"}
            </Link>
          ))}
        </nav>
        <form className="w-full sm:w-64" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <Input name="q" defaultValue={q} placeholder="Search campaigns…" aria-label="Search campaigns" />
        </form>
      </div>

      <Card>
        {submissions.length === 0 ? (
          <EmptyState
            icon={FileStack}
            title={status || q ? "No submissions match these filters" : "No submissions yet"}
            description={status || q ? "Try a different status or search." : "Create a submission to start the review workflow."}
            action={
              can.createSubmissions(member.role) && !status && !q && (
                <ButtonLink href="/submissions/new">New submission</ButtonLink>
              )
            }
          />
        ) : (
          <SubmissionsTable submissions={submissions} showCreator={member.role !== "marketing"} />
        )}
      </Card>
    </div>
  );
}
