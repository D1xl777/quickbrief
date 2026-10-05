import type { Metadata } from "next";
import Link from "next/link";
import { NewSubmissionForm } from "@/components/submission/new-submission-form";
import { Alert } from "@/components/ui/alert";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New submission" };

export default async function NewSubmissionPage() {
  await requirePageRole(["marketing", "admin"]);
  const supabase = await createClient();
  const [brands, jurisdictions] = await Promise.all([
    supabase
      .from("brands")
      .select("id, name, brand_jurisdictions(jurisdiction_id)")
      .eq("status", "active")
      .order("name"),
    supabase.from("jurisdictions").select("id, name, code").eq("is_active", true).order("name"),
  ]);
  if (brands.error || jurisdictions.error) throw new Error("Could not load brands and jurisdictions.");

  return (
    <div className="max-w-4xl">
      <PageHeader
        eyebrow={<Link href="/submissions" className="hover:text-ink">Submissions</Link>}
        title="New Submission"
        description="Upload a marketing creative before publication. You can save a draft, run the automated first-pass check, or submit straight to compliance review."
      />
      {brands.data.length === 0 ? (
        <Alert tone="warning" title="No active brands">
          An admin needs to create a brand and assign jurisdictions before submissions can be made.
        </Alert>
      ) : (
        <NewSubmissionForm
          brands={brands.data.map((b) => ({
            id: b.id,
            name: b.name,
            jurisdictionIds: b.brand_jurisdictions.map((bj) => bj.jurisdiction_id),
          }))}
          jurisdictions={jurisdictions.data}
        />
      )}
    </div>
  );
}
