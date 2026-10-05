import type { Metadata } from "next";
import { setJurisdictionActive } from "@/actions/settings";
import { RoleBadge } from "@/components/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, Td, Th } from "@/components/ui/table";
import { can, requirePageMember } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { AddMemberForm, JurisdictionForm, OrganizationForm, RoleSelect } from "./forms";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const member = await requirePageMember();
  const isAdmin = can.manageOrganization(member.role);
  const supabase = await createClient();

  const [members, jurisdictions] = await Promise.all([
    supabase
      .from("organization_members")
      .select("id, role, created_at, user_id, profile:profiles(full_name, email)")
      .order("created_at"),
    supabase.from("jurisdictions").select("*").order("name"),
  ]);
  if (members.error || jurisdictions.error) throw new Error("Could not load settings.");

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Your profile, organisation, users and jurisdictions." />

      <Card>
        <CardHeader title="Your profile" />
        <CardBody className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-ink-subtle">Name</p>
            <p className="mt-0.5 font-medium">{member.profile.full_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-ink-subtle">Email</p>
            <p className="mt-0.5 font-medium">{member.email}</p>
          </div>
          <div>
            <p className="text-xs text-ink-subtle">Role</p>
            <p className="mt-1">
              <RoleBadge role={member.role} />
            </p>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Organisation" />
        <CardBody>
          {isAdmin ? (
            <OrganizationForm name={member.organization.name} />
          ) : (
            <p className="text-sm">{member.organization.name}</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Users"
          description={`${members.data.length} people in ${member.organization.name}`}
        />
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Joined</Th>
              <Th className="text-right">Role</Th>
            </tr>
          </thead>
          <tbody>
            {members.data.map((m) => (
              <tr key={m.id}>
                <Td className="font-medium">{m.profile?.full_name || "—"}</Td>
                <Td className="text-ink-muted">{m.profile?.email}</Td>
                <Td className="text-ink-muted">{formatDate(m.created_at)}</Td>
                <Td className="text-right">
                  {isAdmin ? (
                    <RoleSelect memberId={m.id} role={m.role} />
                  ) : (
                    <span className="text-ink-muted">{ROLE_LABELS[m.role]}</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
        {isAdmin && (
          <CardBody className="border-t border-border">
            <p className="mb-3 text-sm font-medium">Add a user</p>
            <AddMemberForm />
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Jurisdictions"
          description="Markets your organisation operates in. Policies and submissions are scoped to these."
        />
        <Table>
          <thead>
            <tr>
              <Th>Code</Th>
              <Th>Name</Th>
              <Th>Status</Th>
              {isAdmin && <Th className="text-right">Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {jurisdictions.data.map((j) => (
              <tr key={j.id}>
                <Td className="font-mono text-xs">{j.code}</Td>
                <Td className="font-medium">{j.name}</Td>
                <Td>
                  <Badge tone={j.is_active ? "green" : "neutral"} dot>
                    {j.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                {isAdmin && (
                  <Td className="text-right">
                    <form action={setJurisdictionActive}>
                      <input type="hidden" name="id" value={j.id} />
                      <input type="hidden" name="active" value={String(!j.is_active)} />
                      <Button type="submit" variant="ghost" size="sm">
                        {j.is_active ? "Deactivate" : "Activate"}
                      </Button>
                    </form>
                  </Td>
                )}
              </tr>
            ))}
            {jurisdictions.data.length === 0 && (
              <tr>
                <Td colSpan={4} className="py-8 text-center text-ink-subtle">
                  No jurisdictions configured yet.
                </Td>
              </tr>
            )}
          </tbody>
        </Table>
        {isAdmin && (
          <CardBody className="border-t border-border">
            <JurisdictionForm />
          </CardBody>
        )}
      </Card>
    </div>
  );
}
