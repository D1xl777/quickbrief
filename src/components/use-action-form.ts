"use client";

import { useActionState, useTransition, type FormEvent } from "react";

/**
 * Like useActionState, but keeps what the user typed when the action fails.
 * (React resets forms automatically after a `<form action={…}>` submission;
 * submitting via onSubmit avoids losing input on validation errors.)
 * The clicked submit button's name/value (e.g. intent=check) is included.
 */
export function useActionForm<S>(
  action: (prev: S | null, formData: FormData) => Promise<S>,
  options: { confirm?: (formData: FormData) => boolean } = {},
) {
  const [state, dispatch, pendingAction] = useActionState(action, null);
  const [pendingTransition, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const formData = new FormData(event.currentTarget, submitter);
    if (options.confirm && !options.confirm(formData)) return;
    startTransition(() => dispatch(formData));
  }

  return { state, pending: pendingAction || pendingTransition, onSubmit };
}
