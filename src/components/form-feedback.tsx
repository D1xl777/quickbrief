import { Alert } from "@/components/ui/alert";
import type { ActionResult } from "@/lib/types";

export function FormFeedback({ state }: { state: ActionResult<unknown> | null }) {
  if (!state) return null;
  if (state.ok) return state.message ? <Alert tone="success">{state.message}</Alert> : null;
  return <Alert tone="error">{state.error}</Alert>;
}

export function fieldError(state: ActionResult<unknown> | null, key: string) {
  if (!state || state.ok) return undefined;
  return state.fieldErrors?.[key]?.[0];
}
