"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { check, formString, toActionError, UserFacingError } from "@/lib/action-utils";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
import { jurisdictionSchema, memberSchema, organizationSchema, uuid } from "@/lib/validation";

export async function updateOrganization(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireRole(["admin"]);
    const input = organizationSchema.parse({ name: formString(formData, "name") });
    const admin = createAdminClient();
    check(
      await admin
        .from("organizations")
        .update({ name: input.name })
        .eq("id", member.organization.id)
        .select("id")
        .single(),
      "update the organisation",
    );
    await recordAudit(admin, member, {
      action: "organization.updated",
      entityType: "organization",
      entityId: member.organization.id,
      description: `Renamed organisation to "${input.name}"`,
      metadata: { before: member.organization.name, after: input.name },
    });
    revalidatePath("/", "layout");
    return { ok: true, message: "Organisation saved." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function addMember(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireRole(["admin"]);
    const input = memberSchema.parse({
      full_name: formString(formData, "full_name"),
      email: formString(formData, "email").trim().toLowerCase(),
      role: formString(formData, "role"),
      password: formString(formData, "password"),
    });
    const admin = createAdminClient();

    const created = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: input.full_name },
    });
    if (created.error || !created.data.user) {
      const msg = created.error?.message ?? "";
      if (/already/i.test(msg)) {
        throw new UserFacingError("A user with this email already exists.");
      }
      console.error("createUser failed", created.error);
      throw new UserFacingError("Could not create the user.");
    }
    const userId = created.data.user.id;

    check(
      await admin
        .from("organization_members")
        .insert({ organization_id: member.organization.id, user_id: userId, role: input.role })
        .select("id")
        .single(),
      "add the member",
    );
    await recordAudit(admin, member, {
      action: "member.added",
      entityType: "user",
      entityId: userId,
      description: `Added ${input.email} as ${input.role}`,
      metadata: { email: input.email, role: input.role },
    });
    revalidatePath("/settings");
    return {
      ok: true,
      message: `${input.full_name} can now sign in with the temporary password you set.`,
    };
  } catch (err) {
    return toActionError(err);
  }
}

export async function changeMemberRole(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireRole(["admin"]);
    const memberId = uuid.parse(formString(formData, "member_id"));
    const role = z.enum(["admin", "marketing", "compliance"]).parse(formString(formData, "role"));
    const admin = createAdminClient();
    const orgId = member.organization.id;

    const target = check(
      await admin
        .from("organization_members")
        .select("id, role, user_id, profile:profiles(email)")
        .eq("id", memberId)
        .eq("organization_id", orgId)
        .maybeSingle(),
      "load the member",
    );
    if (target.role === role) return { ok: true };

    if (target.role === "admin") {
      const { count } = await admin
        .from("organization_members")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        throw new UserFacingError("The organisation must keep at least one admin.");
      }
    }

    check(
      await admin
        .from("organization_members")
        .update({ role })
        .eq("id", memberId)
        .eq("organization_id", orgId)
        .select("id")
        .single(),
      "change the role",
    );
    await recordAudit(admin, member, {
      action: "member.role_changed",
      entityType: "user",
      entityId: target.user_id,
      description: `Changed role of ${target.profile?.email ?? "user"} from ${target.role} to ${role}`,
      metadata: { before: target.role, after: role },
    });
    revalidatePath("/settings");
    return { ok: true, message: "Role updated." };
  } catch (err) {
    return toActionError(err);
  }
}

export async function createJurisdiction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const member = await requireRole(["admin"]);
    const input = jurisdictionSchema.parse({
      code: formString(formData, "code"),
      name: formString(formData, "name"),
    });
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("jurisdictions")
      .insert({ organization_id: member.organization.id, code: input.code, name: input.name })
      .select("id")
      .single();
    if (error?.code === "23505") throw new UserFacingError(`Code ${input.code} already exists.`);
    if (error || !data) throw new UserFacingError("Could not create the jurisdiction.");

    await recordAudit(admin, member, {
      action: "jurisdiction.created",
      entityType: "jurisdiction",
      entityId: data.id,
      description: `Added jurisdiction ${input.name} (${input.code})`,
    });
    revalidatePath("/settings");
    return { ok: true, message: `${input.name} added.` };
  } catch (err) {
    return toActionError(err);
  }
}

export async function setJurisdictionActive(formData: FormData): Promise<void> {
  const member = await requireRole(["admin"]);
  const id = uuid.parse(formString(formData, "id"));
  const active = formString(formData, "active") === "true";
  const admin = createAdminClient();
  const row = check(
    await admin
      .from("jurisdictions")
      .update({ is_active: active })
      .eq("id", id)
      .eq("organization_id", member.organization.id)
      .select("id, name, code")
      .single(),
    "update the jurisdiction",
  );
  await recordAudit(admin, member, {
    action: active ? "jurisdiction.activated" : "jurisdiction.deactivated",
    entityType: "jurisdiction",
    entityId: id,
    description: `${active ? "Activated" : "Deactivated"} jurisdiction ${row.name} (${row.code})`,
  });
  revalidatePath("/settings");
}
