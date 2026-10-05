import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getCurrentMember } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import type { ApprovalSnapshot } from "@/lib/approval";
import { ApprovalPdf } from "@/lib/pdf/approval-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(_request: Request, ctx: RouteContext<"/api/approval-records/[id]/pdf">) {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return new Response("Not found", { status: 404 });

  const member = await getCurrentMember();
  if (!member) return new Response("Unauthorized", { status: 401 });

  // Loading through the user's client enforces Row Level Security.
  const supabase = await createClient();
  const { data: record, error } = await supabase.from("approval_records").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("Approval record load failed", error);
    return new Response("Could not load the approval record", { status: 500 });
  }
  if (!record) return new Response("Not found", { status: 404 });

  const snapshot = record.snapshot as unknown as ApprovalSnapshot;
  const admin = createAdminClient();

  let image: Buffer | undefined;
  const file = snapshot.version.files.find((f) => f.mime_type === "image/png" || f.mime_type === "image/jpeg");
  if (file) {
    const { data, error: dlError } = await admin.storage.from("creatives").download(file.storage_path);
    if (dlError) console.error("Could not embed creative image in PDF", dlError);
    else image = Buffer.from(await data.arrayBuffer());
  }

  const exportedAt = new Date().toISOString();
  const pdf = await renderToBuffer(
    createElement(ApprovalPdf, {
      referenceCode: record.reference_code,
      snapshot,
      image,
      exportedBy: member.email,
      exportedAt,
    }) as Parameters<typeof renderToBuffer>[0],
  );

  await recordAudit(admin, member, {
    action: "approval_record.exported",
    entityType: "approval_record",
    entityId: record.id,
    submissionId: record.submission_id,
    description: `Exported approval record ${record.reference_code} as PDF`,
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${record.reference_code}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
