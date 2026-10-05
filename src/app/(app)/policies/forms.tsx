"use client";

import { useActionForm } from "@/components/use-action-form";
import { useEffect, useRef, useState } from "react";
import { addRule, createPolicy } from "@/actions/policies";
import { FormFeedback, fieldError } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { CHANNEL_LABELS, CHANNELS, RULE_TYPE_LABELS } from "@/lib/constants";
import type { RuleType } from "@/lib/types";

export function PolicyForm({
  jurisdictions,
  brands,
}: {
  jurisdictions: { id: string; name: string }[];
  brands: { id: string; name: string }[];
}) {
  const { state, onSubmit: action, pending } = useActionForm(createPolicy);
  return (
    <form onSubmit={action} className="space-y-5">
      <FormFeedback state={state} />
      <Field label="Policy name" htmlFor="name" required error={fieldError(state, "name")}>
        <Input id="name" name="name" required placeholder="e.g. UK Marketing Policy" />
      </Field>
      <Field label="Description" htmlFor="description">
        <Textarea id="description" name="description" rows={3} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Jurisdiction" htmlFor="jurisdiction_id" hint="Leave empty to apply to every jurisdiction.">
          <Select id="jurisdiction_id" name="jurisdiction_id" defaultValue="">
            <option value="">All jurisdictions</option>
            {jurisdictions.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Brand" htmlFor="brand_id" hint="Leave empty to apply to every brand.">
          <Select id="brand_id" name="brand_id" defaultValue="">
            <option value="">All brands</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Checkbox name="is_demo" defaultChecked label="Label as DEMO POLICY RULES" />
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create policy"}
        </Button>
      </div>
    </form>
  );
}

const NEEDS_PHRASES: RuleType[] = [
  "required_phrase",
  "prohibited_phrase",
  "required_disclaimer",
  "required_terms_reference",
];

export function RuleForm({ policyId }: { policyId: string }) {
  const { state, onSubmit: action, pending } = useActionForm(addRule);
  const [ruleType, setRuleType] = useState<RuleType>("required_phrase");
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  const phrasesHint =
    ruleType === "required_brand_text"
      ? "Optional. Leave empty to require the submission's brand name."
      : ruleType === "prohibited_phrase"
        ? "One per line. A finding is raised if ANY of these appear."
        : "One per line. Case-insensitive.";

  return (
    <form ref={ref} onSubmit={action} className="space-y-4">
      <input type="hidden" name="policy_id" value={policyId} />
      <FormFeedback state={state} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Code" htmlFor="code" required error={fieldError(state, "code")}>
          <Input id="code" name="code" placeholder="DEMO-UK-010" required />
        </Field>
        <Field label="Title" htmlFor="title" required className="sm:col-span-2" error={fieldError(state, "title")}>
          <Input id="title" name="title" required />
        </Field>
        <Field label="Rule type" htmlFor="rule_type">
          <Select
            id="rule_type"
            name="rule_type"
            value={ruleType}
            onChange={(e) => setRuleType(e.target.value as RuleType)}
          >
            {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Category" htmlFor="category" required error={fieldError(state, "category")}>
          <Input id="category" name="category" defaultValue="General" required />
        </Field>
        <Field label="Severity" htmlFor="severity">
          <Select id="severity" name="severity" defaultValue="medium">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </Field>
      </div>
      {ruleType !== "destination_url_required" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Phrases"
            htmlFor="phrases"
            className="sm:col-span-2"
            hint={phrasesHint}
            error={fieldError(state, "phrases")}
            required={NEEDS_PHRASES.includes(ruleType)}
          >
            <Textarea id="phrases" name="phrases" rows={3} />
          </Field>
          {ruleType !== "prohibited_phrase" && (
            <Field label="Match" htmlFor="match" hint="Require any one phrase, or all of them.">
              <Select id="match" name="match" defaultValue="any">
                <option value="any">Any phrase</option>
                <option value="all">All phrases</option>
              </Select>
            </Field>
          )}
        </div>
      )}
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-ink">
          Channels <span className="font-normal text-ink-subtle">(none selected = all channels)</span>
        </legend>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {CHANNELS.map((c) => (
            <Checkbox key={c} name="channels" value={c} label={CHANNEL_LABELS[c]} />
          ))}
        </div>
      </fieldset>
      <Field label="Explanation" htmlFor="explanation" required hint="Shown to users in findings." error={fieldError(state, "explanation")}>
        <Textarea id="explanation" name="explanation" rows={2} required />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add rule"}
        </Button>
      </div>
    </form>
  );
}
