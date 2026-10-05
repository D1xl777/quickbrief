import Link from "next/link";
import { SubmissionStatusBadge } from "@/components/status-badges";
import { Table, Td, Th } from "@/components/ui/table";
import { CHANNEL_LABELS } from "@/lib/constants";
import { formatRelative } from "@/lib/format";
import type { SubmissionListItem } from "@/lib/queries";

export function SubmissionsTable({
  submissions,
  showCreator = true,
  timeColumn = "updated",
  compact = false,
}: {
  submissions: SubmissionListItem[];
  showCreator?: boolean;
  timeColumn?: "updated" | "submitted";
  /** Fewer columns, for narrow cards such as the dashboard. */
  compact?: boolean;
}) {
  if (compact) {
    return (
      <Table>
        <thead>
          <tr>
            <Th>Campaign</Th>
            <Th>Status</Th>
            <Th className="text-right">Updated</Th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="hover:bg-zinc-50">
              <Td className="max-w-80">
                <Link
                  href={`/submissions/${s.id}`}
                  className="block truncate font-medium text-ink hover:text-brand-600"
                >
                  {s.campaign_name}
                </Link>
                <p className="truncate text-xs text-ink-subtle">
                  {s.brand?.name} · {s.jurisdiction?.name} · {CHANNEL_LABELS[s.channel]} · v
                  {s.current_version?.version_number ?? 1}
                </p>
              </Td>
              <Td>
                <SubmissionStatusBadge status={s.status} />
              </Td>
              <Td className="text-right whitespace-nowrap text-ink-muted">{formatRelative(s.updated_at)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    );
  }
  return (
    <Table>
      <thead>
        <tr>
          <Th>Campaign</Th>
          <Th>Brand</Th>
          <Th>Jurisdiction</Th>
          <Th>Channel</Th>
          <Th>Version</Th>
          <Th>Status</Th>
          {showCreator && <Th>Submitted by</Th>}
          <Th>{timeColumn === "submitted" ? "Waiting since" : "Updated"}</Th>
        </tr>
      </thead>
      <tbody>
        {submissions.map((s) => (
          <tr key={s.id} className="hover:bg-zinc-50">
            <Td className="max-w-64">
              <Link
                href={`/submissions/${s.id}`}
                className="block truncate font-medium text-ink hover:text-brand-600"
              >
                {s.campaign_name}
              </Link>
            </Td>
            <Td className="whitespace-nowrap">{s.brand?.name}</Td>
            <Td className="whitespace-nowrap">{s.jurisdiction?.name}</Td>
            <Td className="whitespace-nowrap text-ink-muted">{CHANNEL_LABELS[s.channel]}</Td>
            <Td className="font-mono text-xs">v{s.current_version?.version_number ?? 1}</Td>
            <Td>
              <SubmissionStatusBadge status={s.status} />
            </Td>
            {showCreator && (
              <Td className="whitespace-nowrap text-ink-muted">
                {s.creator?.full_name || s.creator?.email}
              </Td>
            )}
            <Td className="whitespace-nowrap text-ink-muted">
              {formatRelative(timeColumn === "submitted" ? s.submitted_at : s.updated_at)}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
