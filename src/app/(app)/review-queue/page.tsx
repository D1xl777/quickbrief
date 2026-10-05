import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { SubmissionsTable } from "@/components/submissions-table";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageRole } from "@/lib/auth";
import { listSubmissions } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Review Queue" };

export default async function ReviewQueuePage() {
  await requirePageRole(["compliance", "admin"]);
  const supabase = await createClient();
  const [pending, recentlyDecided] = await Promise.all([
    listSubmissions(supabase, { status: ["pending_review"], orderBy: "submitted_at" }),
    listSubmissions(supabase, { status: ["approved", "rejected", "changes_requested"], limit: 8 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review Queue"
        description="Submissions waiting for a compliance decision, oldest first."
      />
      <Card>
        <CardHeader title={`Waiting for review (${pending.length})`} />
        {pending.length === 0 ? (
          <EmptyState icon={ClipboardCheck} title="The queue is empty" description="New submissions appear here when marketing sends them for review." />
        ) : (
          <SubmissionsTable submissions={pending} timeColumn="submitted" />
        )}
      </Card>
      <Card>
        <CardHeader title="Recently decided" />
        {recentlyDecided.length === 0 ? (
          <EmptyState title="No decisions yet" />
        ) : (
          <SubmissionsTable submissions={recentlyDecided} />
        )}
      </Card>
    </div>
  );
}
