import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { FamilyMembersTable } from "@/components/family/family-members-table";
import { FamilySummaryCards } from "@/components/family/family-summary-cards";
import { listFamilyMembers } from "@/lib/actions/family-members";
import { FAMILY_KYC_STATUS_LABELS, FAMILY_RELATIONSHIP_LABELS } from "@/lib/labels";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";
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

  const buildHref = (params: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    const merged = { relationship, kyc, beneficiaries, ...params };
    for (const [key, value] of Object.entries(merged)) {
      if (value) search.set(key, value);
    }
    const qs = search.toString();
    return qs ? `/family/members?${qs}` : "/family/members";
  };

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

        <div className="flex flex-wrap gap-2">
          <Button variant={!relationship ? "default" : "outline"} size="sm" asChild>
            <Link href={buildHref({ relationship: undefined })}>All</Link>
          </Button>
          {Object.entries(FAMILY_RELATIONSHIP_LABELS).map(([value, label]) => (
            <Button key={value} variant={relationship === value ? "default" : "outline"} size="sm" asChild>
              <Link href={buildHref({ relationship: value })}>{label}</Link>
            </Button>
          ))}
          <Button variant={beneficiaries === "1" ? "default" : "outline"} size="sm" asChild>
            <Link href={buildHref({ beneficiaries: beneficiaries === "1" ? undefined : "1" })}>Beneficiaries</Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.entries(FAMILY_KYC_STATUS_LABELS).map(([value, label]) => (
            <Button key={value} variant={kyc === value ? "default" : "outline"} size="sm" asChild>
              <Link href={buildHref({ kyc: kyc === value ? undefined : value })}>{label}</Link>
            </Button>
          ))}
        </div>

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
