import { db } from "@/lib/db";
import { buildSystemItem } from "@/lib/calendar/helpers";
import type { CalendarItem } from "@/lib/calendar/types";
import { canAccess } from "@/lib/permissions/access";
import { cashBankAccountFilter } from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";

const STALE_DAYS = 30;

export async function getCashCalendarItems(ctx: UserContext): Promise<CalendarItem[]> {
  if (!canAccess(ctx, "CASH_MANAGEMENT")) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - STALE_DAYS);

  const accounts = await db.bankAccount.findMany({
    where: {
      ...cashBankAccountFilter(ctx),
      OR: [{ balanceAsOf: null }, { balanceAsOf: { lt: cutoff } }],
    },
    select: {
      id: true,
      accountName: true,
      bankName: true,
      balanceAsOf: true,
      entityId: true,
      entity: { select: { name: true } },
    },
    take: 20,
  });

  if (accounts.length === 0) return [];

  const staleDate = accounts.reduce<Date>((latest, account) => {
    const asOf = account.balanceAsOf ?? new Date(0);
    return asOf > latest ? asOf : latest;
  }, new Date(0));

  return [
    buildSystemItem({
      id: "system:cash:stale-balances",
      kind: "CASH_STALE",
      module: "CASH_MANAGEMENT",
      title: "Cash balances need updating",
      subtitle: `${accounts.length} account(s) not updated in ${STALE_DAYS}+ days`,
      date: staleDate.getTime() > 0 ? staleDate : new Date(),
      href: "/cash",
      entityId: accounts[0]?.entityId,
      entityName: accounts[0]?.entity?.name,
    }),
  ];
}
