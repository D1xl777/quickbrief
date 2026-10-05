import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ApprovalSnapshot } from "@/lib/approval";
import { DECISION_LABELS, FINDING_STATUS_LABELS, OUTCOME_LABELS, SEVERITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";

// Never hyphenate words (it splits codes like DEMO-GRP-001 and status labels).
Font.registerHyphenationCallback((word) => [word]);

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 50, fontSize: 9, fontFamily: "Helvetica", color: "#18181b", lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1 solid #e4e4e7", paddingBottom: 12, marginBottom: 16 },
  eyebrow: { fontSize: 8, color: "#047857", fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 4, marginBottom: 2, lineHeight: 1.2 },
  muted: { color: "#71717a" },
  ref: { fontFamily: "Courier-Bold", fontSize: 11, textAlign: "right" },
  section: { marginBottom: 14 },
  h2: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#71717a", letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: "row", borderBottom: "0.5 solid #e4e4e7", paddingVertical: 3 },
  label: { width: 140, color: "#71717a" },
  value: { flex: 1, fontFamily: "Helvetica-Bold" },
  creative: { flexDirection: "row", gap: 12, border: "0.5 solid #e4e4e7", padding: 8, borderRadius: 4 },
  mono: { fontFamily: "Courier", fontSize: 8.5 },
  th: { flexDirection: "row", backgroundColor: "#f4f4f5", paddingVertical: 4, paddingHorizontal: 4, fontFamily: "Helvetica-Bold", fontSize: 8 },
  tr: { flexDirection: "row", borderTop: "0.5 solid #e4e4e7", paddingVertical: 4, paddingHorizontal: 4 },
  disclaimer: { marginTop: 10, padding: 8, backgroundColor: "#f4f4f5", fontSize: 8, color: "#52525b" },
  footer: { position: "absolute", bottom: 20, left: 40, right: 40, fontSize: 7, color: "#a1a1aa", flexDirection: "row", justifyContent: "space-between" },
});

const STATUS_COLORS = { pass: "#047857", potential_issue: "#b91c1c", review_required: "#b45309" } as const;

function Field({ label, children }: { label: string; children: string }) {
  return (
    <View style={s.row} wrap={false}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{children}</Text>
    </View>
  );
}

/** Server-rendered PDF of an approval record. Rendered only from the frozen snapshot. */
export function ApprovalPdf({
  referenceCode,
  snapshot: a,
  image,
  exportedBy,
  exportedAt,
}: {
  referenceCode: string;
  snapshot: ApprovalSnapshot;
  image?: Buffer;
  exportedBy: string;
  exportedAt: string;
}) {
  return (
    <Document title={`Approval record ${referenceCode}`} author={a.organization.name} subject={a.submission.campaign_name}>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.eyebrow}>APPROVAL RECORD</Text>
            <Text style={s.title}>{a.submission.campaign_name}</Text>
            <Text style={s.muted}>{a.organization.name}</Text>
          </View>
          <View>
            <Text style={s.ref}>{referenceCode}</Text>
            <Text style={[s.muted, { textAlign: "right" }]}>{`Approved ${formatDateTime(a.approved_at)}`}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>SUBMISSION</Text>
          <Field label="Organisation">{a.organization.name}</Field>
          <Field label="Brand">{a.brand.name}</Field>
          <Field label="Campaign">{a.submission.campaign_name}</Field>
          <Field label="Jurisdiction">{`${a.jurisdiction.name} (${a.jurisdiction.code})`}</Field>
          <Field label="Channel">{a.submission.channel_label}</Field>
          <Field label="Submitted by">{`${a.submission.created_by.name} (${a.submission.created_by.email})`}</Field>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>DECISION</Text>
          <Field label="Decision">Approved</Field>
          <Field label="Submission version">{`Version ${a.version.number} of ${a.version.total_versions}`}</Field>
          <Field label="Reviewer">{`${a.reviewer.name} (${a.reviewer.email})`}</Field>
          <Field label="Approval timestamp">{formatDateTime(a.approved_at)}</Field>
          <Field label="Reviewer comment">{a.review_comment || "-"}</Field>
          <Field label="Policy versions used">
            {a.policies.length
              ? a.policies.map((p) => `${p.name} v${p.version}${p.is_demo ? " (DEMO)" : ""}`).join("; ")
              : "None"}
          </Field>
        </View>

        <View style={s.section} wrap={false}>
          <Text style={s.h2}>{`APPROVED CREATIVE · VERSION ${a.version.number}`}</Text>
          <View style={s.creative}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {image && <Image src={image} style={{ width: 200, objectFit: "contain" }} />}
            <View style={{ flex: 1 }}>
              <Text style={s.mono}>{a.version.creative_text || "(no text)"}</Text>
              <Text style={[s.muted, { marginTop: 6, fontSize: 8 }]}>
                {`Destination URL: ${a.version.destination_url ?? "not provided"}${
                  a.version.files.length ? ` · File: ${a.version.files.map((f) => f.file_name).join(", ")}` : ""
                }`}
              </Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.h2}>AUTOMATED FINDINGS AT TIME OF APPROVAL</Text>
          <Text style={[s.muted, { marginBottom: 4 }]}>
            {`${OUTCOME_LABELS[a.check_run.outcome]}. ${a.check_run.summary} Check run ${formatDateTime(a.check_run.created_at)}, AI layer: ${a.check_run.ai_provider}.`}
          </Text>
          <View style={s.th}>
            <Text style={{ width: 95 }}>Status</Text>
            <Text style={{ width: 50 }}>Severity</Text>
            <Text style={{ flex: 1 }}>Finding</Text>
            <Text style={{ width: 130 }}>Reference</Text>
          </View>
          {a.findings.map((f, i) => (
            <View key={i} style={s.tr} wrap={false}>
              <Text style={{ width: 95, color: STATUS_COLORS[f.status], fontFamily: "Helvetica-Bold" }}>
                {FINDING_STATUS_LABELS[f.status].toUpperCase()}
              </Text>
              <Text style={{ width: 50 }}>{f.status === "pass" ? "-" : SEVERITY_LABELS[f.severity]}</Text>
              <View style={{ flex: 1, paddingRight: 6 }}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>{f.title}</Text>
                <Text style={[s.muted, { fontSize: 7.5 }]}>{f.evidence}</Text>
              </View>
              <Text style={{ width: 130, fontSize: 7.5, color: "#52525b" }}>{f.rule_reference}</Text>
            </View>
          ))}
        </View>

        <View style={s.section}>
          <Text style={s.h2}>REVIEW HISTORY</Text>
          {a.review_history.map((r, i) => (
            <Text key={i} style={{ marginBottom: 2 }}>
              {`${DECISION_LABELS[r.decision]} · v${r.version_number} · ${r.reviewer} · ${formatDateTime(r.created_at)}${r.comment ? ` · "${r.comment}"` : ""}`}
            </Text>
          ))}
        </View>

        <Text style={s.disclaimer}>{a.disclaimer}</Text>

        <View style={s.footer} fixed>
          <Text>{`${referenceCode} · Exported ${formatDateTime(exportedAt)} by ${exportedBy}`}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
