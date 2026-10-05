import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setPolicyStatus, setRuleActive } from "@/actions/policies";
import { DemoRulesNotice } from "@/components/demo-rules-notice";
import { DemoBadge, SeverityBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { can, requirePageMember } from "@/lib/auth";
import { CHANNEL_LABELS, RULE_TYPE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";
import { RuleForm } from "../forms";

export const metadata: Metadata = { title: "Policy" };

export default async function PolicyPage(props: PageProps<"/policies/[id]">) {
  const { id } = await props.params;
  if (!uuid.safeParse(id).success) notFound();
  const member = await requirePageMember();
  const supabase = await createClient();
  const { data: policy, error } = await supabase
    .from("policies")
    .select("*, jurisdiction:jurisdictions(name), brand:brands(name), policy_rules(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Could not load the policy: ${error.message}`);
  if (!policy) notFound();

  const isAdmin = can.managePolicies(member.role);
  const rules = [...policy.policy_rules].sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<Link href="/policies" className="hover:text-ink">Policies</Link>}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {policy.name}
            <Badge tone="neutral">v{policy.version}</Badge>
            {policy.is_demo && <DemoBadge />}
          </span>
        }
        description={policy.description || undefined}
        actions={
          isAdmin && (
            <form action={setPolicyStatus}>
              <input type="hidden" name="policy_id" value={policy.id} />
              <input
                type="hidden"
                name="status"
                value={policy.status === "active" ? "inactive" : "active"}
              />
              <Button type="submit" variant="secondary">
                {policy.status === "active" ? "Deactivate policy" : "Activate policy"}
              </Button>
            </form>
          )
        }
      />
      {policy.is_demo && <DemoRulesNotice />}

      <Card>
        <CardBody className="grid gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-ink-subtle">Jurisdiction</p>
            <p className="mt-0.5 font-medium">{policy.jurisdiction?.name ?? "All jurisdictions"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-subtle">Brand</p>
            <p className="mt-0.5 font-medium">{policy.brand?.name ?? "All brands"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-subtle">Status</p>
            <p className="mt-1">
              <Badge tone={policy.status === "active" ? "green" : "neutral"} dot>
                {policy.status === "active" ? "Active" : "Inactive"}
              </Badge>
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-subtle">Last changed</p>
            <p className="mt-0.5 font-medium">{formatDateTime(policy.updated_at)}</p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Rules"
          description="Changing rules creates a new policy version. Past checks keep a copy of the rules they used."
        />
        {rules.length === 0 ? (
          <EmptyState title="No rules yet" description="Add the first rule below." />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Rule</Th>
                <Th>Type</Th>
                <Th>Severity</Th>
                <Th>Channels</Th>
                <Th>Status</Th>
                {isAdmin && <Th />}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const config = (rule.config ?? {}) as { phrases?: string[]; match?: string };
                return (
                  <tr key={rule.id} className={rule.is_active ? "" : "opacity-60"}>
                    <Td className="font-mono text-xs whitespace-nowrap">{rule.code}</Td>
                    <Td className="max-w-md">
                      <p className="font-medium">{rule.title}</p>
                      <p className="mt-0.5 text-xs text-ink-subtle">{rule.explanation}</p>
                      {config.phrases && config.phrases.length > 0 && (
                        <p className="mt-1 text-xs text-ink-muted">
                          {config.match === "all" ? "All of: " : "Any of: "}
                          {config.phrases.map((p) => `“${p}”`).join(", ")}
                        </p>
                      )}
                    </Td>
                    <Td className="text-xs whitespace-nowrap">
                      {RULE_TYPE_LABELS[rule.rule_type]}
                      <p className="text-ink-subtle">{rule.category}</p>
                    </Td>
                    <Td>
                      <SeverityBadge severity={rule.severity} />
                    </Td>
                    <Td className="text-xs">
                      {rule.channels.length === 0
                        ? "All"
                        : rule.channels.map((c) => CHANNEL_LABELS[c]).join(", ")}
                    </Td>
                    <Td>
                      <Badge tone={rule.is_active ? "green" : "neutral"} dot>
                        {rule.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </Td>
                    {isAdmin && (
                      <Td className="text-right">
                        <form action={setRuleActive}>
                          <input type="hidden" name="rule_id" value={rule.id} />
                          <input type="hidden" name="active" value={String(!rule.is_active)} />
                          <Button type="submit" variant="ghost" size="sm">
                            {rule.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </form>
                      </Td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader title="Add rule" />
          <CardBody>
            <RuleForm policyId={policy.id} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
