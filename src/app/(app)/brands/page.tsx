import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { can, requirePageMember } from "@/lib/auth";
import { signedUrls } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Brands" };

export default async function BrandsPage() {
  const member = await requirePageMember();
  const supabase = await createClient();
  const { data: brands, error } = await supabase
    .from("brands")
    .select("*, brand_jurisdictions(jurisdiction:jurisdictions(id, code, name))")
    .order("name");
  if (error) throw new Error(`Could not load brands: ${error.message}`);

  const { data: counts } = await supabase.from("submissions").select("brand_id");
  const submissionCount = new Map<string, number>();
  for (const row of counts ?? []) {
    submissionCount.set(row.brand_id, (submissionCount.get(row.brand_id) ?? 0) + 1);
  }
  const logos = await signedUrls(brands.map((b) => b.logo_path));
  const isAdmin = can.manageBrands(member.role);

  return (
    <>
      <PageHeader
        title="Brands"
        description="Brands your organisation markets, and the jurisdictions each is active in."
        actions={
          isAdmin && (
            <ButtonLink href="/brands/new">
              <Plus className="size-4" aria-hidden /> New brand
            </ButtonLink>
          )
        }
      />
      {brands.length === 0 ? (
        <Card>
          <EmptyState
            icon={Tag}
            title="No brands yet"
            description="Brands are used to scope submissions and policies."
            action={isAdmin && <ButtonLink href="/brands/new">Create a brand</ButtonLink>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {brands.map((brand) => {
            const logo = brand.logo_path ? logos.get(brand.logo_path) : undefined;
            return (
              <Link key={brand.id} href={`/brands/${brand.id}`} className="group">
                <Card className="h-full p-5 transition-colors group-hover:border-border-strong">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="" className="size-10 rounded-md border border-border object-contain" />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded-md bg-zinc-900 text-sm font-semibold text-white">
                          {brand.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-ink">{brand.name}</p>
                        <p className="text-xs text-ink-subtle">
                          {submissionCount.get(brand.id) ?? 0} submissions
                        </p>
                      </div>
                    </div>
                    <Badge tone={brand.status === "active" ? "green" : "neutral"} dot>
                      {brand.status === "active" ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {brand.description && (
                    <p className="mt-3 line-clamp-2 text-[13px] text-ink-muted">{brand.description}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {brand.brand_jurisdictions.length === 0 ? (
                      <span className="text-xs text-ink-subtle">No active jurisdictions</span>
                    ) : (
                      brand.brand_jurisdictions.map(
                        (bj) =>
                          bj.jurisdiction && (
                            <Badge key={bj.jurisdiction.id}>{bj.jurisdiction.name}</Badge>
                          ),
                      )
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
