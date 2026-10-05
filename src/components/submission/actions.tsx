"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { MessageSquarePlus, ScanSearch, Send } from "lucide-react";
import { addComment, reviewSubmission } from "@/actions/reviews";
import { createVersion, runCheck, submitForReview } from "@/actions/submissions";
import { FormFeedback, fieldError } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/form";
import { ImageInput } from "./image-input";

export function RunCheckButton({ submissionId, variant = "secondary" }: { submissionId: string; variant?: "primary" | "secondary" }) {
  const [state, action, pending] = useActionState(runCheck, null);
  return (
    <form action={action} className="contents">
      <input type="hidden" name="submission_id" value={submissionId} />
      <Button type="submit" variant={variant} disabled={pending}>
        <ScanSearch className="size-4" aria-hidden /> {pending ? "Checking…" : "Run Check"}
      </Button>
      {state && !state.ok && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function SubmitForReviewButton({ submissionId, warn }: { submissionId: string; warn: boolean }) {
  const [state, action, pending] = useActionState(submitForReview, null);
  return (
    <form
      action={action}
      className="contents"
      onSubmit={(e) => {
        if (
          warn &&
          !window.confirm(
            "The automated check flagged potential issues. Submit for compliance review anyway?",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="submission_id" value={submissionId} />
      <Button type="submit" disabled={pending}>
        <Send className="size-4" aria-hidden /> {pending ? "Submitting…" : "Submit for Review"}
      </Button>
      {state && !state.ok && <p className="w-full text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

const DECISIONS = [
  { value: "approved", label: "Approve", tone: "peer-checked:border-emerald-500 peer-checked:bg-emerald-50 peer-checked:text-emerald-800" },
  { value: "changes_requested", label: "Request Changes", tone: "peer-checked:border-amber-500 peer-checked:bg-amber-50 peer-checked:text-amber-800" },
  { value: "rejected", label: "Reject", tone: "peer-checked:border-red-500 peer-checked:bg-red-50 peer-checked:text-red-800" },
] as const;

export function ReviewDecisionForm({
  submissionId,
  versionId,
  versionNumber,
}: {
  submissionId: string;
  versionId: string;
  versionNumber: number;
}) {
  const [state, action, pending] = useActionState(reviewSubmission, null);
  const [decision, setDecision] = useState<string>("");
  const commentRequired = decision === "changes_requested" || decision === "rejected";

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="submission_id" value={submissionId} />
      <input type="hidden" name="version_id" value={versionId} />
      <FormFeedback state={state} />
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-ink">Decision for version {versionNumber}</legend>
        <div className="grid grid-cols-3 gap-2">
          {DECISIONS.map((d) => (
            <label key={d.value} className="cursor-pointer">
              <input
                type="radio"
                name="decision"
                value={d.value}
                className="peer sr-only"
                checked={decision === d.value}
                onChange={() => setDecision(d.value)}
              />
              <span
                className={cn(
                  "flex h-9 items-center justify-center rounded-md border border-border-strong bg-surface px-2 text-center text-xs font-medium text-ink-muted peer-focus-visible:outline-2 peer-focus-visible:outline-brand-500",
                  d.tone,
                )}
              >
                {d.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label="Review comment"
        htmlFor="review-comment"
        required={commentRequired}
        hint={commentRequired ? "Required: explain what must change or why it is rejected." : "Optional for approvals. Stored on the approval record."}
        error={fieldError(state, "comment")}
      >
        <Textarea id="review-comment" name="comment" rows={4} required={commentRequired} />
      </Field>
      <Button type="submit" className="w-full" disabled={pending || !decision}>
        {pending ? "Recording decision…" : "Record decision"}
      </Button>
      <p className="text-[11px] text-ink-subtle">
        Your name, the timestamp, this version and the automated findings at this moment are stored as evidence.
      </p>
    </form>
  );
}

export function CommentForm({ submissionId }: { submissionId: string }) {
  const [state, action, pending] = useActionState(addComment, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-2">
      <input type="hidden" name="submission_id" value={submissionId} />
      {state && !state.ok && <p className="text-xs text-red-600">{state.error}</p>}
      <Textarea name="comment" rows={2} placeholder="Add a comment…" aria-label="Comment" required />
      <div className="flex justify-end">
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          <MessageSquarePlus className="size-3.5" aria-hidden /> {pending ? "Posting…" : "Add comment"}
        </Button>
      </div>
    </form>
  );
}

export function NewVersionForm({
  submissionId,
  nextVersionNumber,
  defaults,
  currentImageName,
}: {
  submissionId: string;
  nextVersionNumber: number;
  defaults: { creativeText: string; destinationUrl: string };
  currentImageName: string | null;
}) {
  const [state, action, pending] = useActionState(createVersion, null);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="submission_id" value={submissionId} />
      <FormFeedback state={state} />
      <Field label="Creative text" htmlFor="nv-text" error={fieldError(state, "creative_text")}>
        <Textarea
          id="nv-text"
          name="creative_text"
          rows={7}
          defaultValue={defaults.creativeText}
          className="font-mono text-[13px]"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Destination URL" htmlFor="nv-url" error={fieldError(state, "destination_url")}>
          <Input id="nv-url" name="destination_url" type="url" defaultValue={defaults.destinationUrl} placeholder="https://" />
        </Field>
        <Field label="What changed?" htmlFor="nv-note" hint="Shown in the version history.">
          <Input id="nv-note" name="change_note" maxLength={2000} placeholder="e.g. Added safer gambling message" />
        </Field>
      </div>
      <Field label="Image" htmlFor="nv-image" hint="Upload a new image to replace the current one.">
        <ImageInput id="nv-image" />
      </Field>
      {currentImageName && (
        <Checkbox name="keep_image" defaultChecked label={`Keep current image (${currentImageName}) if no new image is chosen`} />
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="submit" name="intent" value="save" variant="secondary" disabled={pending}>
          Save version {nextVersionNumber}
        </Button>
        <Button type="submit" name="intent" value="check" disabled={pending}>
          <ScanSearch className="size-4" aria-hidden /> {pending ? "Working…" : `Save version ${nextVersionNumber} & Run Check`}
        </Button>
      </div>
    </form>
  );
}
