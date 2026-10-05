import type { Metadata } from "next";
import Link from "next/link";
import { createBrand } from "@/actions/brands";
import { BrandForm } from "@/components/brand-form";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { requirePageRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New brand" };

export default async function NewBrandPage() {
  await requirePageRole(["admin"]);
  const supabase = await createClient();
  const { data: jurisdictions, error } = await supabase
    .from("jurisdictions")
    .select("*")
    .eq("is_active", true)
    .order("name");
  if (error) throw new Error(`Could not load jurisdictions: ${error.message}`);

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={<Link href="/brands" className="hover:text-ink">Brands</Link>}
        title="New brand"
      />
      <Card>
        <CardBody>
          <BrandForm action={createBrand} jurisdictions={jurisdictions} submitLabel="Create brand" />
        </CardBody>
      </Card>
    </div>
  );
}
