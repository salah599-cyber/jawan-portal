import Link from "next/link";
import { RowActions } from "@/components/platform/row-actions";
import { deleteFamilyMember } from "@/lib/actions/family-members";
import {
  FAMILY_KYC_STATUS_LABELS,
  FAMILY_RELATIONSHIP_LABELS,
} from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { FamilyMemberListRow } from "@/lib/actions/family-members";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function kycVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETE") return "default";
  if (status === "EXPIRED") return "destructive";
  if (status === "IN_PROGRESS") return "secondary";
  return "outline";
}

export function FamilyMembersTable({
  members,
  canEdit,
}: {
  members: FamilyMemberListRow[];
  canEdit: boolean;
}) {
  if (members.length === 0) {
    return <p className="text-sm text-muted-foreground">No family members registered yet.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Relationship</TableHead>
          <TableHead>KYC</TableHead>
          <TableHead>Stakes</TableHead>
          <TableHead>Beneficiary</TableHead>
          <TableHead>ID Expiry</TableHead>
          {canEdit ? <TableHead className="w-[60px]">Actions</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {members.map((member) => (
          <TableRow key={member.id}>
            <TableCell className="font-medium">
              <Link href={`/family/members/${member.id}`} className="hover:underline">
                {member.fullName}
              </Link>
              {member.preferredName ? (
                <p className="text-xs text-muted-foreground">{member.preferredName}</p>
              ) : null}
              {member.deceased ? (
                <Badge variant="outline" className="mt-1">Deceased</Badge>
              ) : null}
            </TableCell>
            <TableCell>
              {member.relationship ? FAMILY_RELATIONSHIP_LABELS[member.relationship] ?? member.relationship : "—"}
            </TableCell>
            <TableCell>
              <Badge variant={kycVariant(member.effectiveKycStatus)}>
                {FAMILY_KYC_STATUS_LABELS[member.effectiveKycStatus] ?? member.effectiveKycStatus}
              </Badge>
            </TableCell>
            <TableCell>{member.stakeCount}</TableCell>
            <TableCell>{member.isBeneficiary ? "Yes" : "—"}</TableCell>
            <TableCell>{member.idExpiryDate ? formatDate(member.idExpiryDate) : "—"}</TableCell>
            {canEdit ? (
              <TableCell>
                <RowActions
                  editHref={`/family/members/${member.id}/edit`}
                  itemId={member.id}
                  itemLabel={member.fullName}
                  deleteAction={deleteFamilyMember}
                />
              </TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
