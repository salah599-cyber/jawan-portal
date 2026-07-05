import { db } from "@/lib/db";
import { ensureDefaultEntity } from "@/lib/data/entities";
import { ensureCashManagementSchema } from "@/lib/db/ensure-cash-management-schema";
import { canAccess } from "@/lib/permissions/access";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import { cashBankAccountFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { recordAssetValuation } from "@/lib/portfolio/valuations";

export const MANAGED_CASH_ASSET_PREFIX = "Cash & Bank — ";

export function managedCashAssetName(entityName: string, currency: string): string {
  return `${MANAGED_CASH_ASSET_PREFIX}${entityName} (${currency})`;
}

export function isManagedCashAssetName(name: string): boolean {
  return name.startsWith(MANAGED_CASH_ASSET_PREFIX);
}

type CashGroup = {
  entityId: string;
  entityName: string;
  currency: string;
  totalBalance: number;
  latestBalanceAsOf: Date | null;
};

async function buildCashGroups(ctx: UserContext): Promise<CashGroup[]> {
  const accounts = await db.bankAccount.findMany({
    where: cashBankAccountFilter(ctx),
    include: { entity: { select: { name: true } } },
  });

  const defaultEntity = await ensureDefaultEntity();
  const groups = new Map<string, CashGroup>();

  for (const account of accounts) {
    if (!account.includeInCashPosition) continue;
    if (!account.currentBalance) continue;

    const balance = parseFloat(account.currentBalance.toString());
    if (Number.isNaN(balance) || balance <= 0) continue;

    const entityId = account.entityId ?? defaultEntity.id;
    const entityName = account.entity?.name ?? defaultEntity.name;
    const key = `${entityId}:${account.currency}`;
    const existing = groups.get(key);

    if (existing) {
      existing.totalBalance += balance;
      if (
        account.balanceAsOf &&
        (!existing.latestBalanceAsOf || account.balanceAsOf > existing.latestBalanceAsOf)
      ) {
        existing.latestBalanceAsOf = account.balanceAsOf;
      }
    } else {
      groups.set(key, {
        entityId,
        entityName,
        currency: account.currency,
        totalBalance: balance,
        latestBalanceAsOf: account.balanceAsOf,
      });
    }
  }

  return [...groups.values()];
}

export async function syncBankBalancesToCashAssets(ctx: UserContext): Promise<void> {
  if (!canAccess(ctx, "CASH_MANAGEMENT")) return;

  await ensureCashManagementSchema();
  const groups = await buildCashGroups(ctx);
  const activeKeys = new Set(groups.map((g) => `${g.entityId}:${g.currency}`));

  for (const group of groups) {
    const name = managedCashAssetName(group.entityName, group.currency);
    const valuedAt = group.latestBalanceAsOf ?? new Date();

    const existing = await db.asset.findFirst({
      where: {
        ...assetEntityFilter(ctx),
        entityId: group.entityId,
        category: "CASH",
        name,
        status: { in: ["ACTIVE", "MONITOR"] },
      },
      select: { id: true, currentValue: true },
    });

    if (existing) {
      await db.asset.update({
        where: { id: existing.id },
        data: {
          currentValue: group.totalBalance.toString(),
          currency: group.currency,
          valueUpdatedAt: valuedAt,
          cash: {
            upsert: {
              create: { balance: group.totalBalance.toString() },
              update: { balance: group.totalBalance.toString() },
            },
          },
        },
      });

      await recordAssetValuation({
        assetId: existing.id,
        value: group.totalBalance,
        currency: group.currency,
        valuedAt,
        notes: "Synced from bank balances",
      });
      continue;
    }

    const created = await db.asset.create({
      data: {
        name,
        category: "CASH",
        status: "ACTIVE",
        entityId: group.entityId,
        currency: group.currency,
        currentValue: group.totalBalance.toString(),
        valueUpdatedAt: valuedAt,
        cash: {
          create: {
            balance: group.totalBalance.toString(),
          },
        },
      },
    });

    await recordAssetValuation({
      assetId: created.id,
      value: group.totalBalance,
      currency: group.currency,
      valuedAt,
      notes: "Synced from bank balances",
    });
  }

  const managedAssets = await db.asset.findMany({
    where: {
      ...assetEntityFilter(ctx),
      category: "CASH",
      name: { startsWith: MANAGED_CASH_ASSET_PREFIX },
      status: { in: ["ACTIVE", "MONITOR"] },
    },
    select: { id: true, entityId: true, currency: true, name: true },
  });

  for (const asset of managedAssets) {
    const key = `${asset.entityId}:${asset.currency}`;
    if (activeKeys.has(key)) continue;

    await db.asset.update({
      where: { id: asset.id },
      data: {
        currentValue: null,
        valueUpdatedAt: new Date(),
      },
    });
  }
}
