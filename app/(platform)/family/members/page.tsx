import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { FamilyMembersTable } from "@/components/family/family-members-table";
import { FamilySummaryCards } from "@/components/family/family-summary-cards";
import { FamilyMembersFilters } from "@/components/family/family-members-filters";
import { listFamilyMembers } from "@/lib/actions/family-members";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function FamilyMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ relationship?: string; kyc?: string; beneficiaries?: string }>;
}) {
  const { relationship, kyc, beneficiaries } = await searchParams;
  const ctx = await requireModuleAccess("FAMILY_MEMBERS");

  const members = await listFamilyMembers({
    relationship,
    kycStatus: kyc,
    beneficiariesOnly: beneficiaries === "1",
  });

  const canEdit = canWrite(ctx, "FAMILY_MEMBERS");

  return (
    <>
      <PlatformHeader title="Family Members & Beneficiaries" />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Family Register</h2>
            <p className="text-sm text-muted-foreground">
              Central register of family members — identity, KYC, ownership, signatory roles, and beneficiary designations.
            </p>
          </div>
          {canEdit ? <AddLinkButton href="/family/members/new" label="Add Member" /> : null}
        </div>

        <FamilySummaryCards members={members} />

        <FamilyMembersFilters
          relationship={relationship}
          kyc={kyc}
          beneficiariesOnly={beneficiaries === "1"}
          currentParams={{ relationship, kyc, beneficiaries }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>{members.length} family member{members.length === 1 ? "" : "s"} on record</CardDescription>
          </CardHeader>
          <CardContent>
            <FamilyMembersTable members={members} canEdit={canEdit} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
