import type { CalendarItem } from "@/lib/calendar/types";
import type { UserContext } from "@/lib/permissions/types";
import { getCashCalendarItems } from "@/lib/calendar/providers/cash";
import { getChequeCalendarItems } from "@/lib/calendar/providers/cheques";
import { getCompanyCalendarItems } from "@/lib/calendar/providers/companies";
import { getDocumentCalendarItems } from "@/lib/calendar/providers/documents";
import { getExpenseCalendarItems } from "@/lib/calendar/providers/expenses";
import { getLoanCalendarItems } from "@/lib/calendar/providers/loans";
import { getPeMonitoringCalendarItems } from "@/lib/calendar/providers/pe-monitoring";
import { getLpCapitalCallCalendarItems } from "@/lib/calendar/providers/lp-capital-calls";
import { getInsuranceCalendarItems } from "@/lib/calendar/providers/insurance";
import { getFamilyKycCalendarItems } from "@/lib/calendar/providers/family";
import { getSuccessionCalendarItems } from "@/lib/calendar/providers/succession";
import { getProposalCalendarItems } from "@/lib/calendar/providers/proposals";
import { getRealEstateCalendarItems } from "@/lib/calendar/providers/real-estate";
import { getVehicleCalendarItems } from "@/lib/calendar/providers/vehicles";

export async function getSystemCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  const batches = await Promise.all([
    getChequeCalendarItems(ctx),
    getExpenseCalendarItems(ctx),
    getLoanCalendarItems(ctx),
    getDocumentCalendarItems(ctx),
    getVehicleCalendarItems(ctx),
    getCompanyCalendarItems(ctx),
    getRealEstateCalendarItems(ctx),
    getPeMonitoringCalendarItems(ctx),
    getLpCapitalCallCalendarItems(ctx),
    getInsuranceCalendarItems(ctx),
    getFamilyKycCalendarItems(ctx),
    getSuccessionCalendarItems(ctx),
    getProposalCalendarItems(ctx),
    getCashCalendarItems(ctx),
  ]);

  return batches.flat().sort((a, b) => a.date.getTime() - b.date.getTime());
}
