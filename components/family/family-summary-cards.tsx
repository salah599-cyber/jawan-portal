import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FamilyMemberListRow } from "@/lib/actions/family-members";
import { isExpiringWithinDays } from "@/lib/family/helpers";

function SummaryMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
        {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}

export function FamilySummaryCards({ members }: { members: FamilyMemberListRow[] }) {
  const beneficiaries = members.filter((m) => m.isBeneficiary);
  const kycComplete = members.filter((m) => m.effectiveKycStatus === "COMPLETE");
  const kycExpiring = members.filter((m) => isExpiringWithinDays(m.idExpiryDate, 30));
  const deceased = members.filter((m) => m.deceased);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryMetric label="Family Members" value={members.length.toString()} detail="Central person registry" />
      <SummaryMetric label="Beneficiaries" value={beneficiaries.length.toString()} detail="Flagged as beneficiaries" />
      <SummaryMetric
        label="KYC Complete"
        value={kycComplete.length.toString()}
        detail={`${kycExpiring.length} ID expiring within 30 days`}
      />
      <SummaryMetric label="Deceased" value={deceased.length.toString()} detail="Recorded on register" />
    </div>
  );
}
