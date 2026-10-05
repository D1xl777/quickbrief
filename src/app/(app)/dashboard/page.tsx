import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageMember } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const member = await requirePageMember();
  return (
    <PageHeader
      title={`Welcome, ${member.profile.full_name || member.email}`}
      description="Overview of creative submissions and compliance activity."
    />
  );
}
