import { DecisionBadge, FindingStatusBadge, SeverityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import type { ApprovalSnapshot } from "@/lib/approval";
import { OUTCOME_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 border-b border-border py-2.5 text-[13px] last:border-b-0">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="col-span-2 font-medium text-ink">{children}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 text-xs font-semibold tracking-wide text-ink-subtle uppercase">{title}</h2>
      {children}
    </section>
  );
}

export function ApprovalRecordView({
  referenceCode,
  snapshot: s,
  imageUrl,
}: {
  referenceCode: string;
  snapshot: ApprovalSnapshot;
  imageUrl?: string;
}) {
  const decisions = s.review_history.filter((r) => r.decision !== "comment" || r.comment);
  return (
    <article className="space-y-7" data-testid="approval-record">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-semibold tracking-wide text-emerald-700 uppercase">Approval Record</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{s.submission.campaign_name}</h1>
          <p className="mt-1 text-sm text-ink-muted">{s.organization.name}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold" data-testid="reference-code">{referenceCode}</p>
          <p className="mt-1 text-xs text-ink-subtle">Approved {formatDateTime(s.approved_at)}</p>
        </div>
      </header>

      <div className="grid gap-7 lg:grid-cols-2">
        <Section title="Submission">
          <dl>
            <Row label="Organisation">{s.organization.name}</Row>
            <Row label="Brand">{s.brand.name}</Row>
            <Row label="Campaign">{s.submission.campaign_name}</Row>
            <Row label="Jurisdiction">{s.jurisdiction.name} ({s.jurisdiction.code})</Row>
            <Row label="Channel">{s.submission.channel_label}</Row>
            <Row label="Submitted by">{s.submission.created_by.name} ({s.submission.created_by.email})</Row>
          </dl>
        </Section>
        <Section title="Decision">
          <dl>
            <Row label="Decision"><Badge tone="green">Approved</Badge></Row>
            <Row label="Approved version">Version {s.version.number} of {s.version.total_versions}</Row>
            <Row label="Reviewer">{s.reviewer.name} ({s.reviewer.email})</Row>
            <Row label="Approval timestamp">{formatDateTime(s.approved_at)}</Row>
            <Row label="Reviewer comment">{s.review_comment || "—"}</Row>
            <Row label="Policy versions used">
              <ul className="space-y-0.5">
                {s.policies.map((p) => (
                  <li key={p.policy_id}>
                    {p.name} <span className="font-mono text-xs">v{p.version}</span>
                    {p.is_demo && <span className="ml-1 text-[11px] text-orange-700">(DEMO)</span>}
                  </li>
                ))}
                {s.policies.length === 0 && <li>None</li>}
              </ul>
            </Row>
          </dl>
        </Section>
      </div>

      <Section title={`Approved creative · version ${s.version.number}`}>
        <div className="grid gap-5 rounded-lg border border-border p-4 md:grid-cols-5">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="Approved creative" className="w-full rounded border border-border md:col-span-2" />
          )}
          <div className={imageUrl ? "md:col-span-3" : "md:col-span-5"}>
            <p className="font-mono text-[13px] whitespace-pre-wrap">{s.version.creative_text || "(no text)"}</p>
            <p className="mt-3 text-xs text-ink-subtle">
              Destination URL: {s.version.destination_url ?? "not provided"}
              {s.version.files.length > 0 && ` · File: ${s.version.files.map((f) => f.file_name).join(", ")}`}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Automated findings at time of approval">
        <p className="mb-3 text-[13px] text-ink-muted">
          {OUTCOME_LABELS[s.check_run.outcome]} · {s.check_run.summary} Check run {formatDateTime(s.check_run.created_at)}, AI layer: {s.check_run.ai_provider}.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-zinc-50 text-xs text-ink-subtle">
              <tr>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Severity</th>
                <th className="px-3 py-2 font-medium">Finding</th>
                <th className="px-3 py-2 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody>
              {s.findings.map((f, i) => (
                <tr key={i} className="border-t border-border align-top">
                  <td className="px-3 py-2"><FindingStatusBadge status={f.status} /></td>
                  <td className="px-3 py-2">{f.status === "pass" ? "—" : <SeverityBadge severity={f.severity} />}</td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{f.title}</p>
                    <p className="text-xs text-ink-subtle">{f.evidence}</p>
                  </td>
                  <td className="px-3 py-2 text-xs text-ink-muted">{f.rule_reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Review history">
        <ol className="space-y-2">
          {decisions.map((r, i) => (
            <li key={i} className="flex flex-wrap items-start gap-2 text-[13px]">
              <DecisionBadge decision={r.decision} />
              <span className="text-ink-muted">
                v{r.version_number} · {r.reviewer} · {formatDateTime(r.created_at)}
                {r.comment && <> · “{r.comment}”</>}
              </span>
            </li>
          ))}
        </ol>
      </Section>

      <p className="rounded-md border border-border bg-zinc-50 p-3 text-xs text-ink-muted">{s.disclaimer}</p>
    </article>
  );
}
