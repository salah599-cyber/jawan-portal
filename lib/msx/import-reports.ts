import type { PublicMarket } from "@/lib/generated/prisma/client";
import { importBrokerReportsForEntity as importForMarket } from "@/lib/public-markets/import-reports";
import type { ImportBrokerReportsOptions } from "@/lib/public-markets/import-reports";
import type { BrokerReportFile, ImportFileResult } from "@/lib/public-markets/types";
import type { UserContext } from "@/lib/permissions/types";

export type { BrokerReportFile, ImportFileResult, ParsedHolding, ParseReportResult } from "@/lib/public-markets/types";

export async function importBrokerReportsForEntity(
  ctx: UserContext,
  entityId: string,
  files: BrokerReportFile[],
  importOptions: ImportBrokerReportsOptions,
): Promise<ImportFileResult[]> {
  return importForMarket(ctx, entityId, "MSX", files, importOptions);
}

export async function importBrokerReportsForMarket(
  ctx: UserContext,
  entityId: string,
  market: PublicMarket,
  files: BrokerReportFile[],
  importOptions: ImportBrokerReportsOptions,
): Promise<ImportFileResult[]> {
  return importForMarket(ctx, entityId, market, files, importOptions);
}
