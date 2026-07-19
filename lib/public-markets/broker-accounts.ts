import { db } from "@/lib/db";
import type { PublicBrokerAccount } from "@/lib/generated/prisma/client";
import { assetEntityFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

export type PublicBrokerAccountRow = {
  id: string;
  entityId: string;
  entityName: string;
  broker: string;
  accountNumber: string | null;
  label: string | null;
  isManaged: boolean;
  holdingCount: number;
};

function normalizeAccountNumber(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listPublicBrokerAccountsForEntity(
  ctx: UserContext,
  entityId: string,
): Promise<PublicBrokerAccountRow[]> {
  const accounts = await db.publicBrokerAccount.findMany({
    where: {
      entityId,
      entity: assetEntityFilter(ctx),
    },
    include: {
      entity: { select: { name: true } },
      _count: { select: { holdings: true } },
    },
    orderBy: [{ broker: "asc" }, { accountNumber: "asc" }],
  });

  return accounts.map((account) => ({
    id: account.id,
    entityId: account.entityId,
    entityName: account.entity.name,
    broker: account.broker,
    accountNumber: account.accountNumber,
    label: account.label,
    isManaged: account.isManaged,
    holdingCount: account._count.holdings,
  }));
}

export async function getBrokerAccountForImport(
  ctx: UserContext,
  entityId: string,
  brokerAccountId: string,
): Promise<PublicBrokerAccount> {
  const account = await db.publicBrokerAccount.findFirst({
    where: {
      id: brokerAccountId,
      entityId,
      entity: assetEntityFilter(ctx),
    },
  });

  if (!account) {
    throw new Error("Broker account not found for this entity.");
  }

  return account;
}

export type CreatePublicBrokerAccountInput = {
  entityId: string;
  broker: string;
  accountNumber?: string;
  label?: string;
  isManaged?: boolean;
};

export async function createPublicBrokerAccountRecord(
  ctx: UserContext,
  input: CreatePublicBrokerAccountInput,
) {
  const broker = input.broker.trim();
  if (!broker) throw new Error("Broker name is required.");

  const accountNumber = normalizeAccountNumber(input.accountNumber);
  const label = input.label?.trim() || null;

  const entity = await db.entity.findFirst({
    where: { id: input.entityId, ...assetEntityFilter(ctx) },
    select: { id: true },
  });
  if (!entity) throw new Error("Entity not found.");

  const existing = await db.publicBrokerAccount.findFirst({
    where: { entityId: input.entityId, broker, accountNumber },
  });
  if (existing) {
    throw new Error("A broker account with this broker and account number already exists.");
  }

  return db.publicBrokerAccount.create({
    data: {
      entityId: input.entityId,
      broker,
      accountNumber,
      label,
      isManaged: input.isManaged ?? true,
    },
  });
}

export async function updatePublicBrokerAccountRecord(
  ctx: UserContext,
  accountId: string,
  input: Partial<CreatePublicBrokerAccountInput>,
) {
  const existing = await db.publicBrokerAccount.findFirst({
    where: { id: accountId, entity: assetEntityFilter(ctx) },
  });
  if (!existing) throw new Error("Broker account not found.");

  const broker = input.broker?.trim() ?? existing.broker;
  const accountNumber =
    input.accountNumber !== undefined
      ? normalizeAccountNumber(input.accountNumber)
      : existing.accountNumber;
  const label = input.label !== undefined ? input.label.trim() || null : existing.label;
  const isManaged = input.isManaged ?? existing.isManaged;

  const duplicate = await db.publicBrokerAccount.findFirst({
    where: {
      entityId: existing.entityId,
      broker,
      accountNumber,
      NOT: { id: accountId },
    },
  });
  if (duplicate) {
    throw new Error("Another broker account already uses this broker and account number.");
  }

  return db.publicBrokerAccount.update({
    where: { id: accountId },
    data: { broker, accountNumber, label, isManaged },
  });
}

export async function deletePublicBrokerAccountRecord(ctx: UserContext, accountId: string) {
  const existing = await db.publicBrokerAccount.findFirst({
    where: { id: accountId, entity: assetEntityFilter(ctx) },
    include: { _count: { select: { holdings: true } } },
  });
  if (!existing) throw new Error("Broker account not found.");
  if (existing._count.holdings > 0) {
    throw new Error("Remove or reassign holdings before deleting this broker account.");
  }

  await db.publicBrokerAccount.delete({ where: { id: accountId } });
}
import { resolveImportManagementType } from "@/lib/public-markets/import-scope";