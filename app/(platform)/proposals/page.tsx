import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { ProposalsFilterSelect, type ProposalsFilter } from "@/components/proposals/proposals-filter-select";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { listProposals } from "@/lib/actions/proposals";
import { formatApproverProgress } from "@/lib/proposals/approval";
import { formatUserName } from "@/lib/proposals/users";
import { canSubmitProposal } from "@/lib/proposals/submit-access";
import { requireModuleAccess, requireUserContext } from "@/lib/permissions/access";
import { formatMoney, formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function parseFilter(value?: string): ProposalsFilter {
  if (value === "mine" || value === "pending-approval" || value === "approved" || value === "rejected") {
    return value;
  }
  return "all";
}

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter = parseFilter(filterParam);
  const ctx = await requireUserContext();
  await requireModuleAccess("PROPOSALS");
  const proposals = await listProposals(filter);
  const showAdd = canSubmitProposal(ctx);

  return (
    <>
      <PlatformHeader title="Investment Proposals" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-3">
              <div>
                <CardTitle>Proposals</CardTitle>
                <CardDescription>
                  Submit investments for review and track approval outcomes.
                </CardDescription>
              </div>
              <ProposalsFilterSelect current={filter} />
            </div>
            {showAdd ? <AddLinkButton href="/proposals/new" label="New Proposal" /> : null}
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No proposals found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Approvals</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">
                        <Link href={"/proposals/" + proposal.id} className="hover:underline">
                          {proposal.name}
                        </Link>
                      </TableCell>
                      <TableCell>{formatMoney(proposal.suggestedAmount, proposal.currency)}</TableCell>
                      <TableCell>{proposal.entity?.name ?? "—"}</TableCell>
                      <TableCell>
                        <ProposalStatusBadge status={proposal.status} />
                      </TableCell>
                      <TableCell>{formatUserName(proposal.submittedBy)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {proposal.status === "PENDING" || proposal.status === "APPROVED" || proposal.status === "REJECTED"
                          ? formatApproverProgress(proposal.approvers)
                          : "—"}
                      </TableCell>
                      <TableCell>{formatDate(proposal.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
