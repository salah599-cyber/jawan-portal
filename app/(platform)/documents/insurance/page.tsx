import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { InsurancePoliciesTable } from "@/components/insurance/insurance-policies-table";
import { InsuranceSummaryCards } from "@/components/insurance/insurance-summary-cards";
import { listInsurancePolicies } from "@/lib/actions/insurance";
import { listEntities } from "@/lib/data/entities";
import {
  INSURANCE_POLICY_STATUS_LABELS,
  INSURANCE_POLICY_TYPE_LABELS,
} from "@/lib/labels";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function InsuranceRegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string; type?: string; status?: string }>;
}) {
  const { entity: entityParam, type: typeParam, status: statusParam } = await searchParams;
  const ctx = await requireModuleAccess("INSURANCE");

  const entities = await listEntities();
  const entityId = entityParam && entities.some((e) => e.id === entityParam) ? entityParam : undefined;

  const policies = await listInsurancePolicies({
    entityId,
    policyType: typeParam,
    status: statusParam,
  });

  const canEdit = canWrite(ctx, "INSURANCE");

  const buildHref = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = { entity: entityId, type: typeParam, status: statusParam, ...params };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/documents/insurance?${qs}` : "/documents/insurance";
  };

  return (
    <>
      <PlatformHeader title="Insurance Register" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Insurance Register</h2>
            <p className="text-sm text-muted-foreground">
              Track property, vehicle, life, health, business, and other insurance policies.
            </p>
          </div>
          {canEdit ? (
            <AddLinkButton href="/documents/insurance/new" label="Register Policy" />
          ) : null}
        </div>

        <InsuranceSummaryCards policies={policies} />

        <div className="flex flex-wrap gap-2">
          {entities.length > 1 ? (
            <>
              <Button variant={!entityId ? "default" : "outline"} size="sm" asChild>
                <Link href={buildHref({ entity: undefined })}>All entities</Link>
              </Button>
              {entities.map((entity) => (
                <Button
                  key={entity.id}
                  variant={entity.id === entityId ? "default" : "outline"}
                  size="sm"
                  asChild
                >
                  <Link href={buildHref({ entity: entity.id })}>{entity.name}</Link>
                </Button>
              ))}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Type:</span>
          <Button variant={!typeParam ? "default" : "outline"} size="sm" asChild>
            <Link href={buildHref({ type: undefined })}>All</Link>
          </Button>
          {Object.entries(INSURANCE_POLICY_TYPE_LABELS).map(([value, label]) => (
            <Button
              key={value}
              variant={typeParam === value ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={buildHref({ type: value })}>{label}</Link>
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground self-center">Status:</span>
            <Button variant={!statusParam ? "default" : "outline"} size="sm" asChild>
              <Link href={buildHref({ status: undefined })}>All</Link>
            </Button>
            <Button variant={statusParam === "EXPIRING" ? "default" : "outline"} size="sm" asChild>
              <Link href={buildHref({ status: "EXPIRING" })}>Expiring</Link>
            </Button>
            <Button variant={statusParam === "EXPIRED" ? "default" : "outline"} size="sm" asChild>
              <Link href={buildHref({ status: "EXPIRED" })}>Expired</Link>
            </Button>
            {Object.entries(INSURANCE_POLICY_STATUS_LABELS).map(([value, label]) => (
              <Button
                key={value}
                variant={statusParam === value ? "default" : "outline"}
                size="sm"
                asChild
              >
                <Link href={buildHref({ status: value })}>{label}</Link>
              </Button>
            ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Policies</CardTitle>
            <CardDescription>{policies.length} polic{policies.length === 1 ? "y" : "ies"} on record</CardDescription>
          </CardHeader>
          <CardContent>
            <InsurancePoliciesTable policies={policies} canEdit={canEdit} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
