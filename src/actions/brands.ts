"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { check, formString, toActionError, UserFacingError } from "@/lib/action-utils";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/lib/types";
import { brandSchema, uuid } from "@/lib/validation";

function parseBrand(formData: FormData) {
  return brandSchema.parse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    internal_notes: formString(formData, "internal_notes"),
    status: formString(formData, "status") || "active",
    jurisdiction_ids: formData.getAll("jurisdiction_ids").map(String),
  });
}

async function uploadLogo(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  brandId: string,
  formData: FormData,
): Promise<string | null> {
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new UserFacingError("Logo must be a PNG, JPEG, WebP or GIF image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) throw new UserFacingError("Logo must be 5 MB or smaller.");
  const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const path = `${orgId}/brand-logos/${brandId}-${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from("creatives")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    console.error("Logo upload failed", error);
    throw new UserFacingError("Could not upload the logo. Please try again.");
  }
  return path;
}

async function assertJurisdictionsInOrg(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  ids: string[],
) {
  if (ids.length === 0) return;
  const rows = check(
    await admin.from("jurisdictions").select("id").eq("organization_id", orgId).in("id", ids),
    "load jurisdictions",
  );
  if (rows.length !== new Set(ids).size) throw new UserFacingError("Unknown jurisdiction selected.");
}

export async function createBrand(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  let brandId: string;
  try {
    const member = await requireRole(["admin"]);
    const input = parseBrand(formData);
    const admin = createAdminClient();
    const orgId = member.organization.id;
    await assertJurisdictionsInOrg(admin, orgId, input.jurisdiction_ids);

    const dup = await admin
      .from("brands")
      .select("id")
      .eq("organization_id", orgId)
      .ilike("name", input.name)
      .maybeSingle();
    if (dup.data) throw new UserFacingError("A brand with this name already exists.");

    const brand = check(
      await admin
        .from("brands")
        .insert({
          organization_id: orgId,
          name: input.name,
          description: input.description,
          internal_notes: input.internal_notes,
          status: input.status,
        })
        .select("id")
        .single(),
      "create the brand",
    );
    brandId = brand.id;

    const logoPath = await uploadLogo(admin, orgId, brand.id, formData);
    if (logoPath) {
      check(
        await admin.from("brands").update({ logo_path: logoPath }).eq("id", brand.id).select("id").single(),
        "save the logo",
      );
    }
    if (input.jurisdiction_ids.length) {
      check(
        await admin
          .from("brand_jurisdictions")
          .insert(
            input.jurisdiction_ids.map((jid) => ({
              brand_id: brand.id,
              jurisdiction_id: jid,
              organization_id: orgId,
            })),
          )
          .select(),
        "save brand jurisdictions",
      );
    }

    await recordAudit(admin, member, {
      action: "brand.created",
      entityType: "brand",
      entityId: brand.id,
      description: `Created brand "${input.name}"`,
      metadata: { status: input.status, jurisdiction_ids: input.jurisdiction_ids },
    });
  } catch (err) {
    return toActionError(err);
  }
  revalidatePath("/brands");
  redirect(`/brands/${brandId}`);
}

export async function updateBrand(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    const member = await requireRole(["admin"]);
    const brandId = uuid.parse(formString(formData, "id"));
    const input = parseBrand(formData);
    const admin = createAdminClient();
    const orgId = member.organization.id;

    const existing = check(
      await admin
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .eq("organization_id", orgId)
        .maybeSingle(),
      "load the brand",
    );
    await assertJurisdictionsInOrg(admin, orgId, input.jurisdiction_ids);

    const logoPath = await uploadLogo(admin, orgId, brandId, formData);

    check(
      await admin
        .from("brands")
        .update({
          name: input.name,
          description: input.description,
          internal_notes: input.internal_notes,
          status: input.status,
          ...(logoPath ? { logo_path: logoPath } : {}),
        })
        .eq("id", brandId)
        .eq("organization_id", orgId)
        .select("id")
        .single(),
      "update the brand",
    );

    const del = await admin.from("brand_jurisdictions").delete().eq("brand_id", brandId);
    if (del.error) throw new UserFacingError("Could not update brand jurisdictions.");
    if (input.jurisdiction_ids.length) {
      check(
        await admin
          .from("brand_jurisdictions")
          .insert(
            input.jurisdiction_ids.map((jid) => ({
              brand_id: brandId,
              jurisdiction_id: jid,
              organization_id: orgId,
            })),
          )
          .select(),
        "save brand jurisdictions",
      );
    }

    await recordAudit(admin, member, {
      action: "brand.updated",
      entityType: "brand",
      entityId: brandId,
      description: `Updated brand "${input.name}"`,
      metadata: {
        before: { name: existing.name, status: existing.status },
        after: { name: input.name, status: input.status },
        jurisdiction_ids: input.jurisdiction_ids,
      },
    });

    revalidatePath("/brands");
    revalidatePath(`/brands/${brandId}`);
    return { ok: true, data: { id: brandId }, message: "Brand saved." };
  } catch (err) {
    return toActionError(err);
  }
}
