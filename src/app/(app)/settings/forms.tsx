"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addMember,
  changeMemberRole,
  createJurisdiction,
  updateOrganization,
} from "@/actions/settings";
import { FormFeedback, fieldError } from "@/components/form-feedback";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import type { MemberRole } from "@/lib/types";

export function OrganizationForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(updateOrganization, null);
  return (
    <form action={action} className="space-y-4">
      <FormFeedback state={state} />
      <Field label="Organisation name" htmlFor="org-name" error={fieldError(state, "name")}>
        <Input id="org-name" name="name" defaultValue={name} required maxLength={200} />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addMember, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormFeedback state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="m-name" required error={fieldError(state, "full_name")}>
          <Input id="m-name" name="full_name" required />
        </Field>
        <Field label="Email" htmlFor="m-email" required error={fieldError(state, "email")}>
          <Input id="m-email" name="email" type="email" required />
        </Field>
        <Field label="Role" htmlFor="m-role">
          <Select id="m-role" name="role" defaultValue="marketing">
            <option value="marketing">Marketing</option>
            <option value="compliance">Compliance Reviewer</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field
          label="Temporary password"
          htmlFor="m-password"
          required
          hint="Share it securely; at least 10 characters."
          error={fieldError(state, "password")}
        >
          <Input id="m-password" name="password" type="password" minLength={10} required autoComplete="new-password" />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add user"}
      </Button>
    </form>
  );
}

export function RoleSelect({
  memberId,
  role,
  disabled,
}: {
  memberId: string;
  role: MemberRole;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(changeMemberRole, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="member_id" value={memberId} />
      <Select
        name="role"
        defaultValue={role}
        disabled={disabled || pending}
        aria-label="Role"
        className="h-8 w-48 text-xs"
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
      >
        <option value="admin">Admin</option>
        <option value="marketing">Marketing</option>
        <option value="compliance">Compliance Reviewer</option>
      </Select>
      {state && !state.ok && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function JurisdictionForm() {
  const [state, action, pending] = useActionState(createJurisdiction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormFeedback state={state} />
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Code" htmlFor="j-code" className="w-28" error={fieldError(state, "code")}>
          <Input id="j-code" name="code" placeholder="DE" required maxLength={10} />
        </Field>
        <Field label="Name" htmlFor="j-name" className="min-w-48 flex-1" error={fieldError(state, "name")}>
          <Input id="j-name" name="name" placeholder="Germany" required />
        </Field>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add jurisdiction"}
        </Button>
      </div>
    </form>
  );
}
