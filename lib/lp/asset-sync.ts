import { db } from "@/lib/db";
import type { LpCommitmentStatus } from "@/lib/generated/prisma/client";
import { computeLpCommitmentMetrics } from "@/lib/lp/metrics";
import { sumDecimals, toNumber } from "@/lib/lp/helpers";
import { LP_PATH } from "@/lib/lp/constants";

export { LP_PATH };

export function lpStatusToAssetStatus(status: LpCommitmentStatus) {
  switch (status) {
    case "CLOSED":
    case "WRITTEN_OFF":
      return "EXITED" as const;
    case "HARVESTING":
      return "MONITOR" as const;
    default:
      return "ACTIVE" as const;
  }
}

export async function syncLpCommitmentAsset(commitmentId: string) {
  const commitment = await db.lpCommitment.findUnique({
    where: { id: commitmentId },
    include: {
      fund: true,
      capitalCalls: true,
      distributions: true,
      navUpdates: { orderBy: { asOfDate: "desc" }, take: 1 },
    },
  });

  if (!commitment?.assetId) return;

  const metrics = computeLpCommitmentMetrics({
    commitmentAmount: commitment.commitmentAmount,
    capitalCalls: commitment.capitalCalls,
    distributions: commitment.distributions,
    navUpdates: commitment.navUpdates,
  });

  const paidCalls = commitment.capitalCalls.filter((c) => c.status === "PAID");
  const firstPaid = paidCalls
    .slice()
    .sort((a, b) => a.callDate.getTime() - b.callDate.getTime())[0];

  await db.asset.update({
    where: { id: commitment.assetId },
    data: {
      name: `LP: ${commitment.fund.name}`,
      status: lpStatusToAssetStatus(commitment.status),
      currency: commitment.commitmentCurrency,
      acquisitionDate: firstPaid?.paidDate ?? firstPaid?.callDate ?? commitment.commitmentDate,
      acquisitionCost:
        metrics.paidInCapital > 0 ? metrics.paidInCapital.toString() : commitment.commitmentAmount.toString(),
      currentValue: metrics.carryingValue > 0 ? metrics.carryingValue.toString() : null,
      valueUpdatedAt: metrics.latestNavDate ?? undefined,
      exitedAt:
        commitment.status === "CLOSED" || commitment.status === "WRITTEN_OFF"
          ? metrics.latestNavDate ?? new Date()
          : null,
    },
  });
}

export async function refreshLpCapitalCallStatuses(commitmentId: string) {
  const calls = await db.lpCapitalCall.findMany({
    where: { commitmentId, status: { in: ["PENDING", "OVERDUE"] } },
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  await Promise.all(
    calls.map(async (call) => {
      if (!call.dueDate) return;
      const due = new Date(call.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < now && call.status === "PENDING") {
        await db.lpCapitalCall.update({
          where: { id: call.id },
          data: { status: "OVERDUE" },
        });
      }
    }),
  );
}
