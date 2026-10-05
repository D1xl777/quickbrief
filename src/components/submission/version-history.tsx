import Link from "next/link";
import { DecisionBadge, OutcomeBadge } from "@/components/status-badges";
import { cn } from "@/components/ui/cn";
import { formatDateTime } from "@/lib/format";
import type { CheckOutcome, ReviewDecision } from "@/lib/types";

export type VersionRow = {
  id: string;
  versionNumber: number;
  createdAt: string;
  createdBy: string;
  changeNote: string;
  hasImage: boolean;
  latestOutcome: CheckOutcome | null;
  potentialIssues: number | null;
  checkRuns: number;
  decisions: ReviewDecision[];
};

export function VersionHistory({
  submissionId,
  versions,
  currentVersionId,
  viewedVersionId,
}: {
  submissionId: string;
  versions: VersionRow[];
  currentVersionId: string | null;
  viewedVersionId: string;
}) {
  return (
    <ol className="divide-y divide-border" data-testid="version-history">
      {versions.map((v) => {
        const viewed = v.id === viewedVersionId;
        return (
          <li key={v.id}>
            <Link
              href={`/submissions/${submissionId}?v=${v.versionNumber}`}
              scroll={false}
              className={cn("block px-5 py-3 hover:bg-zinc-50", viewed && "bg-brand-50/60")}
              aria-current={viewed ? "true" : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  Version {v.versionNumber}
                  {v.id === currentVersionId && (
                    <span className="ml-2 text-[11px] font-medium text-brand-600">CURRENT</span>
                  )}
                </p>
                <span className="text-[11px] text-ink-subtle">{formatDateTime(v.createdAt)}</span>
              </div>
              <p className="mt-0.5 text-xs text-ink-subtle">
                by {v.createdBy}
                {v.hasImage && " · image"}
                {v.changeNote && ` · ${v.changeNote}`}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {v.latestOutcome ? (
                  <>
                    <OutcomeBadge outcome={v.latestOutcome} />
                    <span className="text-[11px] text-ink-subtle">
                      {v.potentialIssues} finding{v.potentialIssues === 1 ? "" : "s"} flagged
                      {v.checkRuns > 1 && ` · ${v.checkRuns} runs`}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-ink-subtle">Not checked</span>
                )}
                {v.decisions.map((d, i) => (
                  <DecisionBadge key={i} decision={d} />
                ))}
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
