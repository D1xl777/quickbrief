import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PolicyForm } from "../forms";

export const metadata: Metadata = { title: "New policy" };

export default async function NewPolicyPage() {
  await requirePageRole(["admin"]);
  const supabase = await createClient();
  const [j, b] = await Promise.all([
    supabase.from("jurisdictions").select("id, name").eq("is_active", true).order("name"),
    supabase.from("brands").select("id, name").eq("status", "active").order("name"),
  ]);
  if (j.error || b.error) throw new Error("Could not load jurisdictions and brands.");
  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={<Link href="/policies" className="hover:text-ink">Policies</Link>}
        title="New policy"
        description="After creating the policy, add rules to it."
      />
      <Card>
        <CardBody>
          <PolicyForm jurisdictions={j.data} brands={b.data} />
        </CardBody>
      </Card>
    </div>
  );
}
