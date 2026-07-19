import { db } from "@/lib/db";
import { normalizeBrokerName } from "@/lib/public-markets/broker-normalize";

const BACKFILL_MARKER = "legacy-import-backfill";

export async function backfillLegacyManagedPortfolios(): Promise<void> {
  const holdings = await db.publicEquityHolding.findMany({
    where: {
      source: "IMPORT",
      managedPortfolioId: null,
      instrumentType: "EQUITY",
    },
    select: {
      id: true,
      broker: true,
      asset: { select: { entityId: true } },
    },
  });

  if (holdings.length === 0) return;

  const groups = new Map<string, { entityId: string; broker: string; holdingIds: string[] }>();

  for (const holding of holdings) {
    const broker = normalizeBrokerName(holding.broker);
    const key = `${holding.asset.entityId}::${broker}`;
    const existing = groups.get(key);
    if (existing) {
      existing.holdingIds.push(holding.id);
    } else {
      groups.set(key, {
        entityId: holding.asset.entityId,
        broker,
        holdingIds: [holding.id],
      });
    }
  }

  for (const group of groups.values()) {
    const portfolioName = `${group.broker} (imported)`;
    let portfolio = await db.managedPortfolio.findFirst({
      where: {
        entityId: group.entityId,
        managerName: group.broker,
        name: portfolioName,
      },
    });

    if (!portfolio) {
      portfolio = await db.managedPortfolio.create({
        data: {
          entityId: group.entityId,
          managerName: group.broker,
          name: portfolioName,
          notes: BACKFILL_MARKER,
          status: "ACTIVE",
        },
      });
    }

    await db.publicEquityHolding.updateMany({
      where: { id: { in: group.holdingIds } },
      data: { managedPortfolioId: portfolio.id },
    });
  }

  const orphanBatches = await db.importBatch.findMany({
    where: { managedPortfolioId: null },
    include: {
      holdings: {
        select: { managedPortfolioId: true },
      },
    },
  });

  for (const batch of orphanBatches) {
    const portfolioId = batch.holdings.find((holding) => holding.managedPortfolioId)?.managedPortfolioId;
    if (portfolioId) {
      await db.importBatch.update({
        where: { id: batch.id },
        data: { managedPortfolioId: portfolioId },
      });
    }
  }
}

export async function normalizeImportedBrokerNames(): Promise<void> {
  const holdings = await db.publicEquityHolding.findMany({
    where: { source: "IMPORT", broker: { not: null } },
    select: { id: true, broker: true },
  });

  for (const holding of holdings) {
    const normalized = normalizeBrokerName(holding.broker);
    if (normalized !== holding.broker) {
      await db.publicEquityHolding.update({
        where: { id: holding.id },
        data: { broker: normalized },
      });
    }
  }

  const batches = await db.importBatch.findMany({
    where: { broker: { not: null } },
    select: { id: true, broker: true },
  });

  for (const batch of batches) {
    const normalized = normalizeBrokerName(batch.broker);
    if (normalized !== batch.broker) {
      await db.importBatch.update({
        where: { id: batch.id },
        data: { broker: normalized },
      });
    }
  }
}
