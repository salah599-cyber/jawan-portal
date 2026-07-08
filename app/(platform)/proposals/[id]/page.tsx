import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { ProposalApproverPanel } from "@/components/proposals/proposal-approver-panel";
import { ProposalCommentThread } from "@/components/proposals/proposal-comment-thread";
import { ProposalStatusBadge } from "@/components/proposals/proposal-status-badge";
import { deleteProposal, getProposal } from "@/lib/actions/proposals";
import { fileHref } from "@/lib/files/href";
import { canSubmitProposal } from "@/lib/proposals/submit-access";
import { formatUserName } from "@/lib/proposals/users";
import { requireModuleAccess, requireUserContext } from "@/lib/permissions/access";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireUserContext();
  await requireModuleAccess("PROPOSALS");
  const proposal = await getProposal(id);
  if (!proposal) notFound();

  const isSubmitter = proposal.submittedById === ctx.id;
  const canEdit =
    isSubmitter &&
    canSubmitProposal(ctx) &&
    (proposal.status === "DRAFT" || proposal.status === "RETURNED");
  const canDelete = isSubmitter && canSubmitProposal(ctx) && proposal.status === "DRAFT";
  const deck = proposal.documents.find((d) => d.documentType === "DECK");
  const canComment =
    isSubmitter || proposal.approvers.some((a) => a.userId === ctx.id) || canSubmitProposal(ctx);

  return (
    <>
      <PlatformHeader title={proposal.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/proposals">Back to Proposals</Link>
          </Button>
          {canEdit ? <EditLinkButton href={"/proposals/" + proposal.id + "/edit"} label="Edit" /> : null}
          {canDelete ? (
            <DeleteEntryButton
              itemId={proposal.id}
              itemLabel={proposal.name}
              deleteAction={deleteProposal}
              redirectTo="/proposals"
              title="Delete draft proposal?"
            />
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{proposal.name}</CardTitle>
                <ProposalStatusBadge status={proposal.status} />
              </div>
              <CardDescription>
                Submitted by {formatUserName(proposal.submittedBy)}
                {proposal.submittedAt ? " · " + formatDate(proposal.submittedAt) : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Suggested Amount" value={formatMoney(proposal.suggestedAmount, proposal.currency)} />
              <Detail label="Entity" value={proposal.entity?.name} />
              <Detail
                label="Website"
                value={
                  proposal.websiteUrl ? (
                    <a href={proposal.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline">
                      {proposal.websiteUrl}
                    </a>
                  ) : null
                }
              />
              <Detail label="Decided" value={proposal.decidedAt ? formatDate(proposal.decidedAt) : null} />
              <div className="sm:col-span-2">
                <Detail label="Brief" value={proposal.brief} />
              </div>
              <div className="sm:col-span-2">
                <Detail label="Recommendation" value={proposal.recommendation} />
              </div>
            </CardContent>
          </Card>

          <ProposalApproverPanel
            proposalId={proposal.id}
            status={proposal.status}
            approvers={proposal.approvers}
            currentUserId={ctx.id}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Investment Deck</CardTitle>
          </CardHeader>
          <CardContent>
            {deck ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{deck.fileName}</p>
                  <p className="text-sm text-muted-foreground">Uploaded {formatDate(deck.createdAt)}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={fileHref("proposal", deck.id)} target="_blank" rel="noopener noreferrer">Open Deck</a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No deck uploaded yet.</p>
            )}
          </CardContent>
        </Card>

        <ProposalCommentThread
          proposalId={proposal.id}
          comments={proposal.comments}
          canComment={canComment}
        />
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 whitespace-pre-wrap text-sm">{value ?? "—"}</div>
    </div>
  );
}
