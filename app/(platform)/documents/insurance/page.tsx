import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { InsurancePoliciesTable } from "@/components/insurance/insurance-policies-table";
import { InsuranceSummaryCards } from "@/components/insurance/insurance-summary-cards";
import { InsuranceFilters } from "@/components/insurance/insurance-filters";
import { listInsurancePolicies } from "@/lib/actions/insurance";
import { listEntities } from "@/lib/data/entities";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
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

        <InsuranceFilters
          entityId={entityId}
          entities={entities}
          typeParam={typeParam}
          statusParam={statusParam}
          currentParams={{
            entity: entityParam,
            type: typeParam,
            status: statusParam,
          }}
        />

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
