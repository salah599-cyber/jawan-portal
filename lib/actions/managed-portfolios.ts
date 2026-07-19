"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit/log";
import { ensurePublicMarketsSchema } from "@/lib/db/ensure-public-markets-schema";
import { PUBLIC_MARKETS_PATH } from "@/lib/public-markets/constants";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";

export async function createManagedPortfolio(formData: FormData) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to create managed portfolios.");
  }

  const entityId = String(formData.get("entityId") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const managerName = String(formData.get("managerName") ?? "").trim();
  const accountNumber = String(formData.get("accountNumber") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!entityId) throw new Error("Entity is required.");
  if (!name) throw new Error("Portfolio name is required.");
  if (!managerName) throw new Error("Manager name is required.");

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  await ensurePublicMarketsSchema();

  const portfolio = await db.managedPortfolio.create({
    data: {
      entityId,
      name,
      managerName,
      accountNumber,
      notes,
      status: "ACTIVE",
    },
  });

  await logAudit({
    userId: ctx.id,
    action: "CREATE",
    resource: "managed_portfolio",
    resourceId: portfolio.id,
    metadata: { entityId, name, managerName },
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
  return portfolio.id;
}

export async function deleteManagedPortfolio(portfolioId: string) {
  const ctx = await requireModuleAccess("ASSETS");
  if (!canWrite(ctx, "ASSETS")) {
    throw new Error("You do not have permission to delete managed portfolios.");
  }

  const portfolio = await db.managedPortfolio.findUnique({
    where: { id: portfolioId },
    select: { entityId: true, name: true },
  });

  if (!portfolio) throw new Error("Managed portfolio not found.");

  if (ctx.entityIds.length > 0 && !ctx.entityIds.includes(portfolio.entityId)) {
    throw new Error("You do not have access to this entity.");
  }

  const holdingCount = await db.publicEquityHolding.count({
    where: { managedPortfolioId: portfolioId },
  });

  if (holdingCount > 0) {
    throw new Error("Remove or reassign holdings before deleting this managed portfolio.");
  }

  await db.managedPortfolio.delete({ where: { id: portfolioId } });

  await logAudit({
    userId: ctx.id,
    action: "DELETE",
    resource: "managed_portfolio",
    resourceId: portfolioId,
    metadata: { name: portfolio.name },
  });

  revalidatePath(PUBLIC_MARKETS_PATH);
}
