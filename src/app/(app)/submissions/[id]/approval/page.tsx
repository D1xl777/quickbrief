import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { ApprovalRecordView } from "@/components/approval-record-view";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { requirePageMember } from "@/lib/auth";
import type { ApprovalSnapshot } from "@/lib/approval";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

export const metadata: Metadata = { title: "Approval record" };

export default async function ApprovalRecordPage(props: PageProps<"/submissions/[id]/approval">) {
  const { id } = await props.params;
  if (!uuid.safeParse(id).success) notFound();
  await requirePageMember();
  const supabase = await createClient();
  const { data: record, error } = await supabase
    .from("approval_records")
    .select("*")
    .eq("submission_id", id)
    .order("approved_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Could not load the approval record: ${error.message}`);
  if (!record) notFound();

  const snapshot = record.snapshot as unknown as ApprovalSnapshot;
  const file = snapshot.version.files[0];
  const urls = await signedUrls([file?.storage_path]);

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Link href={`/submissions/${id}`} className="text-xs text-ink-subtle hover:text-ink">
          ← Back to submission
        </Link>
        <a href={`/api/approval-records/${record.id}/pdf`} className={buttonClasses("primary")}>
          <Download className="size-4" aria-hidden /> Export PDF
        </a>
      </div>
      <Card>
        <CardBody className="p-6 sm:p-10">
          <ApprovalRecordView
            referenceCode={record.reference_code}
            snapshot={snapshot}
            imageUrl={file ? urls.get(file.storage_path) : undefined}
          />
        </CardBody>
      </Card>
    </div>
  );
}
