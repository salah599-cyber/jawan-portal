import {
  INSURANCE_POLICY_STATUS_LABELS,
  INSURANCE_POLICY_TYPE_LABELS,
  INSURANCE_PREMIUM_FREQUENCY_LABELS,
} from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { SerializedInsurancePolicy } from "@/lib/insurance/serialize";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PeDetailField } from "@/components/pe/pe-detail-field";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "EXPIRED") return "destructive";
  if (status === "PENDING_RENEWAL") return "secondary";
  return "outline";
}

export function InsurancePolicyDetail({ policy }: { policy: SerializedInsurancePolicy }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{policy.policyNumber}</CardTitle>
        <CardDescription>
          {policy.insurer} · {policy.entityName}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PeDetailField
          label="Type"
          value={
            <Badge variant="outline">
              {INSURANCE_POLICY_TYPE_LABELS[policy.policyType] ?? policy.policyType}
            </Badge>
          }
        />
        <PeDetailField
          label="Status"
          value={
            <Badge variant={statusVariant(policy.effectiveStatus)}>
              {INSURANCE_POLICY_STATUS_LABELS[policy.effectiveStatus] ?? policy.effectiveStatus}
            </Badge>
          }
        />
        <PeDetailField label="Policy Holder" value={policy.policyHolder} />
        <PeDetailField label="Description" value={policy.description} />
        <PeDetailField
          label="Premium"
          value={
            policy.premium
              ? `${formatMoney(policy.premium, policy.currency)} (${INSURANCE_PREMIUM_FREQUENCY_LABELS[policy.premiumFrequency] ?? policy.premiumFrequency})`
              : null
          }
        />
        <PeDetailField
          label="Coverage"
          value={policy.coverageAmount ? formatMoney(policy.coverageAmount, policy.currency) : null}
        />
        <PeDetailField label="Start Date" value={policy.startDate ? formatDate(policy.startDate) : null} />
        <PeDetailField label="Expiry Date" value={policy.expiryDate ? formatDate(policy.expiryDate) : null} />
        <PeDetailField label="Renewal Date" value={policy.renewalDate ? formatDate(policy.renewalDate) : null} />
        <PeDetailField label="Linked Asset" value={policy.linkedAssetLabel} />
        {policy.notes ? (
          <div className="sm:col-span-2 lg:col-span-3">
            <PeDetailField label="Notes" value={policy.notes} />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
