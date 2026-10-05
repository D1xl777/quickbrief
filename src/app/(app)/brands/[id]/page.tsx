import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateBrand } from "@/actions/brands";
import { BrandForm } from "@/components/brand-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { can, requirePageMember } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { uuid } from "@/lib/validation";

export const metadata: Metadata = { title: "Brand" };

export default async function BrandPage(props: PageProps<"/brands/[id]">) {
  const { id } = await props.params;
  if (!uuid.safeParse(id).success) notFound();
  const member = await requirePageMember();
  const supabase = await createClient();

  const [{ data: brand, error }, { data: jurisdictions, error: jError }] = await Promise.all([
    supabase
      .from("brands")
      .select("*, brand_jurisdictions(jurisdiction_id)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("jurisdictions").select("*").order("name"),
  ]);
  if (error || jError) throw new Error("Could not load the brand.");
  if (!brand) notFound();

  const selected = brand.brand_jurisdictions.map((bj) => bj.jurisdiction_id);
  const isAdmin = can.manageBrands(member.role);

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={<Link href="/brands" className="hover:text-ink">Brands</Link>}
        title={brand.name}
        description={`Last updated ${formatDateTime(brand.updated_at)}`}
        actions={
          <Badge tone={brand.status === "active" ? "green" : "neutral"} dot>
            {brand.status === "active" ? "Active" : "Inactive"}
          </Badge>
        }
      />
      <Card>
        <CardHeader
          title={isAdmin ? "Brand details" : "Brand details (read-only)"}
          description={isAdmin ? undefined : "Only admins can edit brands."}
        />
        <CardBody>
          {isAdmin ? (
            <BrandForm
              action={updateBrand}
              brand={brand}
              jurisdictions={jurisdictions.filter((j) => j.is_active || selected.includes(j.id))}
              selectedJurisdictionIds={selected}
              submitLabel="Save changes"
            />
          ) : (
            <dl className="grid gap-4 text-sm">
              <div>
                <dt className="text-xs text-ink-subtle">Description</dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{brand.description || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-subtle">Active jurisdictions</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {jurisdictions
                    .filter((j) => selected.includes(j.id))
                    .map((j) => (
                      <Badge key={j.id}>{j.name}</Badge>
                    ))}
                  {selected.length === 0 && "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-subtle">Internal compliance notes</dt>
                <dd className="mt-0.5 whitespace-pre-wrap">{brand.internal_notes || "—"}</dd>
              </div>
            </dl>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
