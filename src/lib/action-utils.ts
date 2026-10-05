import "server-only";
import { z } from "zod";
import { PermissionError } from "@/lib/auth";
import type { ActionResult } from "@/lib/types";

export class UserFacingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserFacingError";
  }
}

/** Converts thrown errors into a result a form can show. Unexpected errors are logged. */
export function toActionError(err: unknown): ActionResult<never> {
  if (err instanceof z.ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "form";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      ok: false,
      error: err.issues[0]?.message ?? "Please check the form.",
      fieldErrors,
    };
  }
  if (err instanceof PermissionError || err instanceof UserFacingError) {
    return { ok: false, error: err.message };
  }
  console.error("Unexpected server action error", err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

/** Throws a UserFacingError when a Supabase call failed. */
export function check<T>(
  result: { data: T; error: { message: string } | null },
  what: string,
): NonNullable<T> {
  if (result.error) {
    console.error(`${what} failed`, result.error);
    throw new UserFacingError(`Could not ${what}. Please try again.`);
  }
  if (result.data === null || result.data === undefined) {
    throw new UserFacingError(`Could not ${what}: not found.`);
  }
  return result.data;
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}
