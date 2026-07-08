import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { ProposalsFilterTabs, type ProposalsFilter } from "@/components/proposals/proposals-filter-tabs";
import { ProposalsTable } from "@/components/proposals/proposals-table";
import { listProposals } from "@/lib/actions/proposals";
import { canSubmitProposal } from "@/lib/proposals/submit-access";
import { requireModuleAccess, requireUserContext } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
              <ProposalsFilterTabs current={filter} />
            </div>
            {showAdd ? <AddLinkButton href="/proposals/new" label="New Proposal" /> : null}
          </CardHeader>
          <CardContent>
            <ProposalsTable proposals={proposals} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
