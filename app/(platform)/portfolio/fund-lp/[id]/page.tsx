import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { LpCommitmentHub } from "@/components/lp/lp-commitment-hub";
import { deleteLpCommitment } from "@/lib/actions/lp-fund";
import { getLpCommitment } from "@/lib/data/lp-fund";
import { serializeLpCommitment } from "@/lib/lp/serialize";
import {
  LP_COMMITMENT_STATUS_LABELS,
  LP_FUND_STRATEGY_LABELS,
} from "@/lib/lp/constants";
import { buildFileAccessContext } from "@/lib/files/download-access";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function FundLpCommitmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const ctx = await requireModuleAccess("FUND_LP");
  const commitment = await getLpCommitment(ctx, id);
  if (!commitment) notFound();

  const serialized = serializeLpCommitment(commitment);
  const canEdit = canWrite(ctx, "FUND_LP");
  const fileAccess = await buildFileAccessContext(
    ctx,
    commitment.documents.map((doc) => ({ kind: "lp-fund" as const, fileId: doc.id })),
  );

  return (
    <>
      <PlatformHeader title={commitment.fund.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/portfolio/fund-lp">Back to Portfolio</Link>
          </Button>
          {commitment.assetId ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/assets/${commitment.assetId}`}>View in Assets</Link>
            </Button>
          ) : null}
          {canEdit ? (
            <>
              <EditLinkButton href={`/portfolio/fund-lp/${commitment.id}/edit`} />
              <DeleteEntryButton
                itemId={commitment.id}
                itemLabel={commitment.fund.name}
                deleteAction={deleteLpCommitment}
                redirectTo="/portfolio/fund-lp"
                title="Delete commitment?"
                description="This will permanently delete the commitment, linked asset, and all related records and documents."
              />
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {LP_FUND_STRATEGY_LABELS[commitment.fund.strategy] ?? commitment.fund.strategy}
          </Badge>
          <Badge variant="secondary">
            {LP_COMMITMENT_STATUS_LABELS[commitment.status] ?? commitment.status}
          </Badge>
          {commitment.fund.vintageYear ? (
            <Badge variant="outline">Vintage {commitment.fund.vintageYear}</Badge>
          ) : null}
          {commitment.fund.gpManager ? (
            <Badge variant="outline">{commitment.fund.gpManager.name}</Badge>
          ) : null}
          <span className="text-sm text-muted-foreground">
            {commitment.entity.name} · {commitment.commitmentCurrency}
          </span>
        </div>

        <LpCommitmentHub commitment={serialized} canEdit={canEdit} defaultTab={tab ?? "overview"} fileAccess={fileAccess} />
      </main>
    </>
  );
}
