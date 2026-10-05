import type { Metadata } from "next";
import Link from "next/link";
import { Lock, ScrollText } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { requirePageRole } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { listAuditEvents } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Audit Log" };

const PAGE_SIZE = 50;
const FILTERS = [
  { key: "", label: "All" },
  { key: "submission", label: "Submissions" },
  { key: "version", label: "Versions" },
  { key: "check", label: "Checks" },
  { key: "review", label: "Reviews" },
  { key: "approval_record", label: "Approval records" },
  { key: "policy", label: "Policies" },
  { key: "brand", label: "Brands" },
  { key: "member", label: "Users" },
  { key: "user", label: "Logins" },
];

export default async function AuditLogPage(props: PageProps<"/audit-log">) {
  await requirePageRole(["compliance", "admin"]);
  const params = await props.searchParams;
  const action = typeof params.action === "string" && FILTERS.some((f) => f.key === params.action) ? params.action : "";
  const before = typeof params.before === "string" && !Number.isNaN(Date.parse(params.before)) ? params.before : undefined;

  const supabase = await createClient();
  const events = await listAuditEvents(supabase, {
    action: action ? `${action}.` : undefined,
    before,
    limit: PAGE_SIZE + 1,
  });
  const hasMore = events.length > PAGE_SIZE;
  const page = events.slice(0, PAGE_SIZE);

  const href = (a: string, b?: string) => {
    const sp = new URLSearchParams();
    if (a) sp.set("action", a);
    if (b) sp.set("before", b);
    const s = sp.toString();
    return s ? `/audit-log?${s}` : "/audit-log";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Audit Log"
        description="Every important action in your organisation, with who did it and when (UTC)."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs text-ink-muted">
            <Lock className="size-3.5" aria-hidden /> Append-only · cannot be edited or deleted
          </span>
        }
      />
      <nav className="flex flex-wrap gap-1" aria-label="Filter events">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={href(f.key)}
            className={cn(buttonClasses("ghost", "sm"), action === f.key && "bg-zinc-200/70 text-ink")}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      <Card>
        <CardHeader title={before ? `Events before ${formatDateTime(before)}` : "Latest events"} />
        {page.length === 0 ? (
          <EmptyState icon={ScrollText} title="No events" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Timestamp (UTC)</Th>
                <Th>Actor</Th>
                <Th>Event</Th>
                <Th>Description</Th>
                <Th>Submission</Th>
              </tr>
            </thead>
            <tbody>
              {page.map((e) => (
                <tr key={e.id}>
                  <Td className="font-mono text-xs whitespace-nowrap text-ink-muted">{formatDateTime(e.created_at)}</Td>
                  <Td className="whitespace-nowrap">{e.actor_email || "System"}</Td>
                  <Td className="font-mono text-xs whitespace-nowrap">{e.action}</Td>
                  <Td className="max-w-md text-[13px] text-ink-muted">{e.description}</Td>
                  <Td className="max-w-48 truncate">
                    {e.submission ? (
                      <Link href={`/submissions/${e.submission.id}`} className="text-brand-600 hover:underline">
                        {e.submission.campaign_name}
                      </Link>
                    ) : (
                      <span className="text-ink-subtle">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      <div className="flex justify-end gap-2">
        {before && (
          <Link href={href(action)} className={buttonClasses("secondary", "sm")}>
            Newest
          </Link>
        )}
        {hasMore && (
          <Link href={href(action, page[page.length - 1]!.created_at)} className={buttonClasses("secondary", "sm")}>
            Older events
          </Link>
        )}
      </div>
    </div>
  );
}
