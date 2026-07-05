import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { RePrivatePropertyHub } from "@/components/real-estate/private/re-private-property-hub";
import {
  getPrivateProperty,
  listPrivateFamilyMembers,
  listPrivateMortgageOptions,
} from "@/lib/data/private-real-estate";
import { serializePrivateProperty } from "@/lib/real-estate/serialize-private";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import {
  RE_OWNERSHIP_STATUS_LABELS,
  RE_PROPERTY_STATUS_LABELS,
} from "@/lib/labels";
import { formatOmr } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export default async function PrivatePropertyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const ctx = await requireModuleAccess("REAL_ESTATE");

  const property = await getPrivateProperty(id, ctx);
  if (!property) notFound();

  const [mortgageOptions, familyMembers] = await Promise.all([
    listPrivateMortgageOptions(ctx, property.entityId),
    listPrivateFamilyMembers(ctx),
  ]);

  const serialized = serializePrivateProperty(property);
  const canEdit = canWrite(ctx, "REAL_ESTATE");
  const location = [property.area, property.wilayat, property.governorate]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PlatformHeader title={property.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold">{property.name}</h2>
              <Badge variant="secondary">Family Villa</Badge>
              <Badge variant="outline">
                {RE_PROPERTY_STATUS_LABELS[property.status] ?? property.status}
              </Badge>
              <Badge variant="outline">
                {RE_OWNERSHIP_STATUS_LABELS[property.ownershipStatus] ?? property.ownershipStatus}
              </Badge>
              {property.ownerDiscrepancy ? (
                <Badge variant="destructive">Owner discrepancy</Badge>
              ) : null}
            </div>
            {location ? <p className="text-sm text-muted-foreground">{location}</p> : null}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>{formatOmr(property.monthlyRunningCostOmr)}/mo running costs</span>
              <span>{property.privateStaff.length} staff</span>
              {property.currentValuationOmr != null ? (
                <span>Valuation {formatOmr(Number(property.currentValuationOmr))}</span>
              ) : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {property.googleMapsUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={property.googleMapsUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Maps
                </a>
              </Button>
            ) : null}
            {canEdit ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/real-estate/private/${id}/edit`}>Edit</Link>
              </Button>
            ) : null}
            <Button variant="outline" size="sm" asChild>
              <Link href="/real-estate/private">Back</Link>
            </Button>
          </div>
        </div>

        <RePrivatePropertyHub
          property={serialized}
          canEdit={canEdit}
          mortgageOptions={mortgageOptions.map((loan) => ({
            id: loan.id,
            name: loan.name,
            lender: loan.lender,
            outstandingBalance: loan.outstandingBalance?.toString() ?? null,
            amount: loan.amount.toString(),
            currency: loan.currency,
          }))}
          familyMembers={familyMembers}
          defaultTab={tab}
        />
      </main>
    </>
  );
}
