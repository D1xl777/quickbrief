"use client";

import { useActionState, useMemo, useState } from "react";
import { Send, ScanSearch, Save } from "lucide-react";
import { createSubmission } from "@/actions/submissions";
import { FormFeedback, fieldError } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CHANNEL_LABELS, CHANNELS } from "@/lib/constants";
import { ImageInput } from "./image-input";

type BrandOption = { id: string; name: string; jurisdictionIds: string[] };
type JurisdictionOption = { id: string; name: string; code: string };

export function NewSubmissionForm({
  brands,
  jurisdictions,
}: {
  brands: BrandOption[];
  jurisdictions: JurisdictionOption[];
}) {
  const [state, action, pending] = useActionState(createSubmission, null);
  const [brandId, setBrandId] = useState(brands.length === 1 ? brands[0]!.id : "");
  const [jurisdictionId, setJurisdictionId] = useState("");

  const available = useMemo(() => {
    const brand = brands.find((b) => b.id === brandId);
    return brand ? jurisdictions.filter((j) => brand.jurisdictionIds.includes(j.id)) : [];
  }, [brandId, brands, jurisdictions]);

  return (
    <form action={action} className="space-y-6">
      <FormFeedback state={state} />
      <Card>
        <CardHeader title="Campaign" description="Where and how this creative will be published." />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          <Field label="Campaign name" htmlFor="campaign_name" required className="sm:col-span-2" error={fieldError(state, "campaign_name")}>
            <Input id="campaign_name" name="campaign_name" required maxLength={200} placeholder="e.g. Autumn Football Weekend" />
          </Field>
          <Field label="Brand" htmlFor="brand_id" required error={fieldError(state, "brand_id")}>
            <Select
              id="brand_id"
              name="brand_id"
              required
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setJurisdictionId("");
              }}
            >
              <option value="" disabled>
                Select a brand
              </option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Jurisdiction"
            htmlFor="jurisdiction_id"
            required
            hint={brandId ? "Only jurisdictions where the brand is active." : "Choose a brand first."}
            error={fieldError(state, "jurisdiction_id")}
          >
            <Select
              id="jurisdiction_id"
              name="jurisdiction_id"
              required
              disabled={!brandId}
              value={jurisdictionId}
              onChange={(e) => setJurisdictionId(e.target.value)}
            >
              <option value="" disabled>
                Select a jurisdiction
              </option>
              {available.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Channel" htmlFor="channel" required error={fieldError(state, "channel")}>
            <Select id="channel" name="channel" required defaultValue="">
              <option value="" disabled>
                Select a channel
              </option>
              {CHANNELS.map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Destination URL"
            htmlFor="destination_url"
            hint="Optional. Where the creative links to."
            error={fieldError(state, "destination_url")}
          >
            <Input id="destination_url" name="destination_url" type="url" placeholder="https://" />
          </Field>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Creative"
          description="Paste all copy exactly as it will be published, including small print."
        />
        <CardBody className="space-y-5">
          <Field label="Creative text" htmlFor="creative_text" error={fieldError(state, "creative_text")}>
            <Textarea id="creative_text" name="creative_text" rows={7} className="font-mono text-[13px]" />
          </Field>
          <Field label="Image upload" htmlFor="image" hint="Optional. Visual content is flagged for human review.">
            <ImageInput />
          </Field>
          <Field label="Internal notes" htmlFor="internal_notes" hint="Context for reviewers. Not part of the creative.">
            <Textarea id="internal_notes" name="internal_notes" rows={3} />
          </Field>
        </CardBody>
      </Card>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-2 border-t border-border bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
        <p className="mr-auto hidden text-xs text-ink-subtle md:block">
          Automated checks are a first pass. A Compliance Reviewer always makes the final decision.
        </p>
        <Button type="submit" name="intent" value="save" variant="secondary" disabled={pending}>
          <Save className="size-4" aria-hidden /> Save Draft
        </Button>
        <Button type="submit" name="intent" value="check" variant="secondary" disabled={pending}>
          <ScanSearch className="size-4" aria-hidden /> Run Check
        </Button>
        <Button type="submit" name="intent" value="submit" disabled={pending}>
          <Send className="size-4" aria-hidden /> {pending ? "Working…" : "Submit for Review"}
        </Button>
      </div>
    </form>
  );
}
