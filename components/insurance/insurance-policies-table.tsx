import Link from "next/link";
import { RowActions } from "@/components/platform/row-actions";
import { deleteInsurancePolicy } from "@/lib/actions/insurance";
import {
  INSURANCE_POLICY_STATUS_LABELS,
  INSURANCE_POLICY_TYPE_LABELS,
} from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import type { InsurancePolicyListRow } from "@/lib/actions/insurance";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "ACTIVE") return "default";
  if (status === "EXPIRED") return "destructive";
  if (status === "PENDING_RENEWAL") return "secondary";
  return "outline";
}

export function InsurancePoliciesTable({
  policies,
  canEdit,
}: {
  policies: InsurancePolicyListRow[];
  canEdit: boolean;
}) {
  if (policies.length === 0) {
    return <p className="text-sm text-muted-foreground">No insurance policies registered yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Policy</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Insurer</TableHead>
          <TableHead>Entity</TableHead>
          <TableHead>Premium</TableHead>
          <TableHead>Expiry</TableHead>
          <TableHead>Status</TableHead>
          {canEdit ? <TableHead className="w-[60px]">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {policies.map((policy) => (
          <TableRow key={policy.id}>
            <TableCell className="font-medium">
              <Link href={`/documents/insurance/${policy.id}`} className="hover:underline">
                {policy.policyNumber}
              </Link>
              {policy.description ? (
                <p className="text-xs text-muted-foreground">{policy.description}</p>
              ) : policy.linkedAssetLabel ? (
                <p className="text-xs text-muted-foreground">{policy.linkedAssetLabel}</p>
              ) : null}
            </TableCell>
            <TableCell>{INSURANCE_POLICY_TYPE_LABELS[policy.policyType] ?? policy.policyType}</TableCell>
            <TableCell>{policy.insurer}</TableCell>
            <TableCell>{policy.entityName}</TableCell>
            <TableCell>
              {policy.premium != null
                ? formatMoney(policy.premium, policy.currency)
                : "—"}
            </TableCell>
            <TableCell>{policy.expiryDate ? formatDate(policy.expiryDate) : "—"}</TableCell>
            <TableCell>
              <Badge variant={statusVariant(policy.effectiveStatus)}>
                {INSURANCE_POLICY_STATUS_LABELS[policy.effectiveStatus] ?? policy.effectiveStatus}
              </Badge>
            </TableCell>
            {canEdit ? (
              <TableCell>
                <RowActions
                  editHref={`/documents/insurance/${policy.id}/edit`}
                  itemId={policy.id}
                  itemLabel={policy.policyNumber}
                  deleteAction={deleteInsurancePolicy}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
