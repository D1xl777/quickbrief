"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const loginSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export type LoginState = { error?: string };

function safeNext(next: string | undefined) {
  // Only allow internal paths, to avoid open redirects.
  if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

export async function login(_prev: LoginState | null, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error || !data.user) {
    return { error: "Incorrect email or password." };
  }

  // Audit the login (best evidence of who used the system and when).
  const admin = createAdminClient();
  const { data: membership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", data.user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) {
    await supabase.auth.signOut();
    return { error: "Your account is not a member of any organisation. Ask your admin." };
  }

  const { error: auditError } = await admin.from("audit_events").insert({
    organization_id: membership.organization_id,
    actor_id: data.user.id,
    actor_email: data.user.email ?? "",
    action: "user.logged_in",
    entity_type: "user",
    entity_id: data.user.id,
    description: "Logged in",
  });
  if (auditError) console.error("Failed to record login audit event", auditError);

  redirect(safeNext(parsed.data.next));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
