"use client";

import { useActionState, useRef } from "react";
import { login, type LoginState } from "@/actions/auth";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";

type DemoAccount = { role: string; name: string; email: string };

export function LoginForm({
  next,
  initialError,
  demoAccounts,
}: {
  next?: string;
  initialError?: string;
  demoAccounts: readonly DemoAccount[];
}) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {
    error: initialError,
  });
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-6">
      <form action={action} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <Field label="Work email" htmlFor="email">
          <Input
            ref={emailRef}
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
          />
        </Field>
        <Field label="Password" htmlFor="password">
          <Input
            ref={passwordRef}
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      {demoAccounts.length > 0 && (
        <div className="rounded-lg border border-dashed border-border-strong bg-zinc-50 p-4">
          <p className="text-xs font-medium text-ink">Demo accounts</p>
          <p className="mt-0.5 text-xs text-ink-subtle">
            Click to fill the email, then enter the demo password.
          </p>
          <div className="mt-3 grid gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  if (emailRef.current) emailRef.current.value = account.email;
                  passwordRef.current?.focus();
                }}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-left text-xs hover:border-brand-500"
              >
                <span>
                  <span className="font-medium text-ink">{account.role}</span>
                  <span className="text-ink-subtle"> · {account.name}</span>
                </span>
                <span className="font-mono text-[11px] text-ink-subtle">{account.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
