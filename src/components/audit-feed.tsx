import Link from "next/link";
import {
  CheckCircle2,
  CircleDot,
  FilePlus2,
  FileUp,
  LogIn,
  MessageSquare,
  ScanSearch,
  Send,
  Settings2,
  XCircle,
  Eye,
  RotateCcw,
} from "lucide-react";
import { formatDateTime, formatRelative } from "@/lib/format";
import type { AuditEventItem } from "@/lib/queries";

function iconFor(action: string) {
  if (action === "submission.created") return FilePlus2;
  if (action === "version.uploaded") return FileUp;
  if (action === "check.run") return ScanSearch;
  if (action === "submission.submitted") return Send;
  if (action === "review.opened") return Eye;
  if (action === "review.approved") return CheckCircle2;
  if (action === "review.rejected") return XCircle;
  if (action === "review.changes_requested") return RotateCcw;
  if (action === "review.comment") return MessageSquare;
  if (action === "user.logged_in") return LogIn;
  if (action.startsWith("policy") || action.startsWith("brand") || action.startsWith("jurisdiction") || action.startsWith("member") || action.startsWith("organization"))
    return Settings2;
  return CircleDot;
}

function toneFor(action: string) {
  if (action === "review.approved") return "text-emerald-600 bg-emerald-50";
  if (action === "review.rejected") return "text-red-600 bg-red-50";
  if (action === "review.changes_requested") return "text-amber-600 bg-amber-50";
  if (action === "submission.submitted") return "text-violet-600 bg-violet-50";
  return "text-ink-subtle bg-zinc-100";
}

export function AuditFeed({
  events,
  showSubmission = true,
  compact = false,
}: {
  events: AuditEventItem[];
  showSubmission?: boolean;
  compact?: boolean;
}) {
  return (
    <ol className="divide-y divide-border">
      {events.map((e) => {
        const Icon = iconFor(e.action);
        return (
          <li key={e.id} className="flex gap-3 px-5 py-3">
            <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${toneFor(e.action)}`}>
              <Icon className="size-3.5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-ink">
                <span className="font-medium">{e.actor_email || "System"}</span>{" "}
                <span className="text-ink-muted">{e.description}</span>
              </p>
              <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-subtle">
                <time dateTime={e.created_at} title={formatDateTime(e.created_at)}>
                  {compact ? formatRelative(e.created_at) : formatDateTime(e.created_at)}
                </time>
                {showSubmission && e.submission && (
                  <Link href={`/submissions/${e.submission.id}`} className="truncate hover:text-brand-600">
                    · {e.submission.campaign_name}
                  </Link>
                )}
                {!compact && <span className="font-mono">· {e.action}</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
