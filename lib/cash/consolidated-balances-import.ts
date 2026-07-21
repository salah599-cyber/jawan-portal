import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensureCashManagementSchema } from "@/lib/db/ensure-cash-management-schema";
import type { ParsedCashBalanceRow } from "@/lib/public-markets/consolidated-portfolio/parse-sheet";
import { canWrite } from "@/lib/permissions/access";
import type { UserContext } from "@/lib/permissions/types";
import { syncBankBalancesToCashAssets } from "@/lib/portfolio/cash-sync";

function accountNameFromLabel(label: string): string {
  const borrowingMarker = label.match(/\(s\/t Fixed Advance/i);
  if (borrowingMarker) {
    return label.slice(0, label.indexOf("(")).trim() + " — Fixed Advance";
  }
  return label.trim();
}

function bankNameFromSource(source?: string): string {
  if (!source) return "Custody";
  if (source.toLowerCase().includes("safra")) return "Banque J. Safra Sarasin SA";
  if (source.toLowerCase().includes("kristal")) return "Kristal";
  return "Custody";
}

export async function importConsolidatedCashBalances(
  ctx: UserContext,
  entityId: string,
  balances: ParsedCashBalanceRow[],
): Promise<number> {
  if (!canWrite(ctx, "CASH_MANAGEMENT")) {
    return 0;
  }

  await ensureCashManagementSchema();
  let imported = 0;

  for (const balance of balances) {
    const accountName = accountNameFromLabel(balance.accountLabel);
    const bankName = bankNameFromSource(balance.source);
    const accountNumber = balance.accountLabel.split("(")[0]?.trim() || balance.accountLabel;

    let account = await db.bankAccount.findFirst({
      where: {
        entityId,
        accountName,
        bankName,
      },
    });

    if (!account) {
      account = await db.bankAccount.create({
        data: {
          entityId,
          accountName,
          bankName,
          accountNumber,
          currency: balance.currency,
          region: "USA",
          notes: balance.source ?? "Imported from consolidated portfolio",
          includeInCashPosition: true,
          includeInTransferLetterSource: false,
          currentBalance: balance.nominalAmount.toFixed(3),
          balanceAsOf: new Date(),
          accountNumbers: {
            create: {
              accountNumber,
              currency: balance.currency,
              label: balance.accountLabel,
              sortOrder: 0,
            },
          },
        },
      });
    } else {
      await db.bankAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: balance.nominalAmount.toFixed(3),
          balanceAsOf: new Date(),
          currency: balance.currency,
        },
      });

      await db.bankBalanceEntry.create({
        data: {
          bankAccountId: account.id,
          balance: balance.nominalAmount.toFixed(3),
          balanceDate: new Date(),
          notes: `Consolidated import — USD valuation ${balance.valuationUsd}`,
        },
      });
    }

    imported += 1;
  }

  await syncBankBalancesToCashAssets(ctx);
  revalidatePath("/cash");
  revalidatePath("/dashboard");

  return imported;
}
