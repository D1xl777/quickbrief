"use client";

import { useActionState } from "react";
import { FormFeedback, fieldError } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import type { ActionResult, Brand, Jurisdiction } from "@/lib/types";

type Action = (
  prev: ActionResult<{ id: string }> | null,
  formData: FormData,
) => Promise<ActionResult<{ id: string }>>;

export function BrandForm({
  action,
  brand,
  jurisdictions,
  selectedJurisdictionIds = [],
  submitLabel,
}: {
  action: Action;
  brand?: Brand;
  jurisdictions: Jurisdiction[];
  selectedJurisdictionIds?: string[];
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-5">
      {brand && <input type="hidden" name="id" value={brand.id} />}
      <FormFeedback state={state} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand name" htmlFor="name" required error={fieldError(state, "name")}>
          <Input id="name" name="name" defaultValue={brand?.name} required maxLength={120} />
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue={brand?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
      </div>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={brand?.description} rows={3} />
      </Field>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-ink">Active jurisdictions</legend>
        {jurisdictions.length === 0 ? (
          <p className="text-xs text-ink-subtle">No jurisdictions configured yet (Settings).</p>
        ) : (
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {jurisdictions.map((j) => (
              <Checkbox
                key={j.id}
                name="jurisdiction_ids"
                value={j.id}
                defaultChecked={selectedJurisdictionIds.includes(j.id)}
                label={`${j.name} (${j.code})`}
              />
            ))}
          </div>
        )}
      </fieldset>
      <Field
        label="Internal compliance notes"
        htmlFor="internal_notes"
        hint="Visible to your organisation only. Not shown on approval records."
      >
        <Textarea
          id="internal_notes"
          name="internal_notes"
          defaultValue={brand?.internal_notes}
          rows={4}
        />
      </Field>
      <Field label="Logo (optional)" htmlFor="logo" hint="PNG, JPEG, WebP or GIF, max 4 MB.">
        <Input
          id="logo"
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="h-auto py-1.5 file:mr-3 file:rounded file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs"
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
