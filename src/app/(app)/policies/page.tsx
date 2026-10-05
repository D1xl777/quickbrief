import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Plus } from "lucide-react";
import { DemoRulesNotice } from "@/components/demo-rules-notice";
import { DemoBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { can, requirePageMember } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Policies" };

export default async function PoliciesPage() {
  const member = await requirePageMember();
  const supabase = await createClient();
  const { data: policies, error } = await supabase
    .from("policies")
    .select(
      "*, jurisdiction:jurisdictions(name, code), brand:brands(name), policy_rules(id, is_active)",
    )
    .order("name");
  if (error) throw new Error(`Could not load policies: ${error.message}`);
  const isAdmin = can.managePolicies(member.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Policies"
        description="Configured policies and rules used by the automated first-pass checks."
        actions={
          isAdmin && (
            <ButtonLink href="/policies/new">
              <Plus className="size-4" aria-hidden /> New policy
            </ButtonLink>
          )
        }
      />
      <DemoRulesNotice />
      <Card>
        {policies.length === 0 ? (
          <EmptyState
            icon={BookOpenCheck}
            title="No policies yet"
            description="Without policies, automated checks have nothing to check against."
            action={isAdmin && <ButtonLink href="/policies/new">Create a policy</ButtonLink>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Policy</Th>
                <Th>Jurisdiction</Th>
                <Th>Brand</Th>
                <Th>Version</Th>
                <Th>Active rules</Th>
                <Th>Status</Th>
                <Th>Updated</Th>
              </tr>
            </thead>
            <tbody>
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <Td>
                    <Link href={`/policies/${p.id}`} className="font-medium text-ink hover:text-brand-600">
                      {p.name}
                    </Link>
                    {p.is_demo && (
                      <div className="mt-1">
                        <DemoBadge />
                      </div>
                    )}
                  </Td>
                  <Td>{p.jurisdiction?.name ?? <span className="text-ink-subtle">All</span>}</Td>
                  <Td>{p.brand?.name ?? <span className="text-ink-subtle">All</span>}</Td>
                  <Td className="font-mono text-xs">v{p.version}</Td>
                  <Td>{p.policy_rules.filter((r) => r.is_active).length}</Td>
                  <Td>
                    <Badge tone={p.status === "active" ? "green" : "neutral"} dot>
                      {p.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </Td>
                  <Td className="text-ink-muted">{formatDate(p.updated_at)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
