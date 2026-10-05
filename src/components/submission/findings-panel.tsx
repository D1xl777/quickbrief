import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { FindingStatusBadge, OutcomeBadge, SeverityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import type { CheckRun, Finding } from "@/lib/types";

const OUTCOME_STYLE = {
  no_issue_detected: { icon: ShieldCheck, cls: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  review_required: { icon: ShieldQuestion, cls: "border-amber-200 bg-amber-50 text-amber-900" },
  potential_issue: { icon: ShieldAlert, cls: "border-red-200 bg-red-50 text-red-900" },
} as const;

export function CheckSummary({ run }: { run: CheckRun }) {
  const style = OUTCOME_STYLE[run.outcome];
  const Icon = style.icon;
  return (
    <div className={`flex gap-3 rounded-md border px-4 py-3 ${style.cls}`} data-testid="check-summary">
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{run.summary}</p>
        <p className="mt-1 text-xs opacity-80">
          {run.potential_issue_count} potential issue{run.potential_issue_count === 1 ? "" : "s"} ·{" "}
          {run.review_required_count} review required · {run.pass_count} passed · checked{" "}
          {formatDateTime(run.created_at)} · AI layer: {run.ai_provider}
        </p>
      </div>
    </div>
  );
}

function FindingItem({ finding }: { finding: Finding }) {
  return (
    <li className="px-5 py-4" data-testid="finding" data-status={finding.status}>
      <div className="flex flex-wrap items-center gap-2">
        <FindingStatusBadge status={finding.status} />
        {finding.status !== "pass" && <SeverityBadge severity={finding.severity} />}
        <Badge tone="neutral" className="font-normal">
          {finding.category}
        </Badge>
        {finding.source === "ai" && <Badge tone="violet">AI layer</Badge>}
      </div>
      <p className="mt-2 text-sm font-medium text-ink">{finding.title}</p>
      <p className="mt-0.5 text-[13px] text-ink-muted">{finding.explanation}</p>
      {finding.evidence && (
        <p className="mt-2 rounded border border-border bg-zinc-50 px-2.5 py-1.5 font-mono text-xs break-words whitespace-pre-wrap text-ink-muted">
          {finding.evidence}
        </p>
      )}
      <p className="mt-2 text-[11px] text-ink-subtle">
        {finding.rule_reference} · {formatDateTime(finding.created_at)}
      </p>
    </li>
  );
}

export function FindingsList({ findings }: { findings: Finding[] }) {
  const issues = findings.filter((f) => f.status === "potential_issue");
  const review = findings.filter((f) => f.status === "review_required");
  const passed = findings.filter((f) => f.status === "pass");
  return (
    <div>
      {issues.length + review.length > 0 && (
        <ul className="divide-y divide-border">
          {[...issues, ...review].map((f) => (
            <FindingItem key={f.id} finding={f} />
          ))}
        </ul>
      )}
      {passed.length > 0 && (
        <details className="group border-t border-border" open={issues.length + review.length === 0}>
          <summary className="cursor-pointer list-none px-5 py-3 text-xs font-medium text-ink-muted hover:text-ink">
            <span className="group-open:hidden">Show</span>
            <span className="hidden group-open:inline">Hide</span> {passed.length} passed check
            {passed.length === 1 ? "" : "s"}
          </summary>
          <ul className="divide-y divide-border border-t border-border">
            {passed.map((f) => (
              <FindingItem key={f.id} finding={f} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export { OutcomeBadge };
