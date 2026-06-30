import { db } from "@/lib/db";
import { canAccess, getModulePermission } from "@/lib/permissions/access";
import {
  assetEntityFilter,
  carEntityFilter,
  companyEntityFilter,
  documentFilter,
  expenseEntityFilter,
  loanEntityFilter,
  landEntityFilter,
} from "@/lib/permissions/scoped-queries";
import type { UserContext } from "@/lib/permissions/types";
import { ASSET_CATEGORY_LABELS } from "@/lib/labels";

export type CurrencyTotal = {
  currency: string;
  amount: number;
};

export type CategoryBreakdown = {
  category: string;
  label: string;
  count: number;
  totals: CurrencyTotal[];
};

export type ModuleSummary = {
  module: string;
  label: string;
  href: string;
  count: number;
  detail?: string;
};

export type DashboardReminder = {
  id: string;
  kind: "document" | "expense" | "vehicle";
  title: string;
  subtitle: string;
  date: Date | null;
  href: string;
  severity: "warning" | "danger";
};

export type DashboardSummary = {
  portfolioTotals: CurrencyTotal[];
  liabilityTotals: CurrencyTotal[];
  netWorthTotals: CurrencyTotal[];
  activeAssetCount: number;
  reminderCount: number;
  categoryBreakdown: CategoryBreakdown[];
  moduleSummaries: ModuleSummary[];
  reminders: DashboardReminder[];
};

const COUNTABLE_ASSET_STATUSES = ["ACTIVE", "MONITOR"] as const;

function weightedValue(
  amount: { toString(): string } | null | undefined,
  ownershipPct: { toString(): string },
): number {
  if (!amount) return 0;
  const value = parseFloat(amount.toString());
  const pct = parseFloat(ownershipPct.toString());
  if (Number.isNaN(value) || Number.isNaN(pct)) return 0;
  return (value * pct) / 100;
}

function addToCurrencyMap(map: Map<string, number>, currency: string, amount: number) {
  if (amount <= 0) return;
  map.set(currency, (map.get(currency) ?? 0) + amount);
}

function mapToTotals(map: Map<string, number>): CurrencyTotal[] {
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function subtractTotals(assets: CurrencyTotal[], liabilities: CurrencyTotal[]): CurrencyTotal[] {
  const map = new Map<string, number>();
  for (const item of assets) {
    map.set(item.currency, (map.get(item.currency) ?? 0) + item.amount);
  }
  for (const item of liabilities) {
    map.set(item.currency, (map.get(item.currency) ?? 0) - item.amount);
  }
  return mapToTotals(map);
}

function liabilityEntityFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

function bankAccountFilter(ctx: UserContext) {
  const level = getModulePermission(ctx, "ASSETS");
  if (level === "FULL" || level === "READ") return {};
  if (level === "FILTERED") return { entityId: { in: ctx.entityIds } };
  return { id: "__none__" };
}

function daysUntil(date: Date) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function getDashboardSummary(ctx: UserContext): Promise<DashboardSummary> {
  const portfolioMap = new Map<string, number>();
  const liabilityMap = new Map<string, number>();
  const categoryMap = new Map<string, { count: number; totals: Map<string, number> }>();
  const moduleSummaries: ModuleSummary[] = [];
  const reminders: DashboardReminder[] = [];

  let activeAssetCount = 0;

  if (canAccess(ctx, "ASSETS")) {
    const assets = await db.asset.findMany({
      where: {
        ...assetEntityFilter(ctx),
        status: { in: [...COUNTABLE_ASSET_STATUSES] },
      },
      select: {
        id: true,
        category: true,
        status: true,
        currentValue: true,
        currency: true,
        ownershipPct: true,
      },
    });

    activeAssetCount = assets.filter((a) => a.status === "ACTIVE").length;

    for (const asset of assets) {
      const value = weightedValue(asset.currentValue, asset.ownershipPct);
      addToCurrencyMap(portfolioMap, asset.currency, value);

      const entry = categoryMap.get(asset.category) ?? { count: 0, totals: new Map<string, number>() };
      entry.count += 1;
      addToCurrencyMap(entry.totals, asset.currency, value);
      categoryMap.set(asset.category, entry);
    }

    const bankAccountCount = await db.bankAccount.count({ where: bankAccountFilter(ctx) });

    moduleSummaries.push({
      module: "ASSETS",
      label: "Assets",
      href: "/assets",
      count: assets.length,
      detail: activeAssetCount + " active",
    });

    moduleSummaries.push({
      module: "BANK",
      label: "Bank Accounts",
      href: "/assets/bank-details",
      count: bankAccountCount,
    });

    const liabilities = await db.liability.findMany({
      where: { ...liabilityEntityFilter(ctx), status: "ACTIVE" },
      select: { amount: true, outstandingBalance: true, currency: true },
    });

    for (const liability of liabilities) {
      const balance = liability.outstandingBalance ?? liability.amount;
      addToCurrencyMap(liabilityMap, liability.currency, parseFloat(balance.toString()));
    }
  }

  if (canAccess(ctx, "LOANS")) {
    const loanCount = await db.liability.count({
      where: { ...loanEntityFilter(ctx), status: "ACTIVE" },
    });

    moduleSummaries.push({
      module: "LOANS",
      label: "Loan Management",
      href: "/loans",
      count: loanCount,
      detail: loanCount > 0 ? "Active facilities" : undefined,
    });

    const loans = await db.liability.findMany({
      where: { ...loanEntityFilter(ctx), status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        lender: true,
        maturityDate: true,
      },
    });

    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 30);

    for (const loan of loans) {
      if (!loan.maturityDate) continue;
      if (loan.maturityDate > horizon) continue;

      reminders.push({
        id: loan.id + "-maturity",
        kind: "document",
        title: loan.name,
        subtitle: "Maturity" + (loan.lender ? " · " + loan.lender : ""),
        date: loan.maturityDate,
        href: "/loans/" + loan.id,
        severity: loan.maturityDate < now ? "danger" : "warning",
      });
    }
  }

  if (canAccess(ctx, "LANDS")) {
    const landCount = await db.landParcel.count({ where: landEntityFilter(ctx) });
    moduleSummaries.push({
      module: "LANDS",
      label: "Lands",
      href: "/lands",
      count: landCount,
    });
  }

  if (canAccess(ctx, "CARS")) {
    const vehicles = await db.vehicle.findMany({
      where: carEntityFilter(ctx),
      select: {
        id: true,
        name: true,
        plateNumber: true,
        plateCode: true,
        registrationExpiryDate: true,
        insuranceExpiryDate: true,
      },
    });

    moduleSummaries.push({
      module: "CARS",
      label: "Cars",
      href: "/cars",
      count: vehicles.length,
    });

    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 30);

    for (const vehicle of vehicles) {
      for (const [date, label] of [
        [vehicle.registrationExpiryDate, "Registration expiry"],
        [vehicle.insuranceExpiryDate, "Insurance expiry"],
      ] as const) {
        if (!date) continue;
        if (date > horizon) continue;

        const plate = [vehicle.plateCode, vehicle.plateNumber].filter(Boolean).join(" ");
        reminders.push({
          id: vehicle.id + "-" + label,
          kind: "vehicle",
          title: vehicle.name,
          subtitle: label + (plate ? " · " + plate : ""),
          date,
          href: "/cars/" + vehicle.id,
          severity: date < now ? "danger" : "warning",
        });
      }
    }
  }

  if (canAccess(ctx, "COMPANIES")) {
    const companies = await db.registeredCompany.findMany({
      where: companyEntityFilter(ctx),
      select: {
        id: true,
        name: true,
        registrationNumber: true,
        registrationExpiryDate: true,
      },
    });

    moduleSummaries.push({
      module: "COMPANIES",
      label: "Companies",
      href: "/companies",
      count: companies.length,
    });

    const now = new Date();
    const horizon = new Date(now);
    horizon.setDate(horizon.getDate() + 30);

    for (const company of companies) {
      if (!company.registrationExpiryDate) continue;
      if (company.registrationExpiryDate > horizon) continue;

      reminders.push({
        id: company.id + "-registration-expiry",
        kind: "document",
        title: company.name,
        subtitle: "Registration expiry · " + company.registrationNumber,
        date: company.registrationExpiryDate,
        href: "/companies/" + company.id,
        severity: company.registrationExpiryDate < now ? "danger" : "warning",
      });
    }
  }

  if (canAccess(ctx, "DOCUMENTS")) {
    const documents = await db.document.findMany({
      where: documentFilter(ctx),
      select: {
        id: true,
        name: true,
        status: true,
        expiryDate: true,
        category: true,
      },
    });

    const expiringDocs = documents.filter(
      (doc) =>
        doc.status === "EXPIRING_SOON" ||
        doc.status === "EXPIRED" ||
        (doc.expiryDate && daysUntil(doc.expiryDate) <= 30),
    );

    moduleSummaries.push({
      module: "DOCUMENTS",
      label: "Documents",
      href: "/documents",
      count: documents.length,
      detail: expiringDocs.length ? expiringDocs.length + " need attention" : undefined,
    });

    for (const doc of expiringDocs) {
      reminders.push({
        id: "doc-" + doc.id,
        kind: "document",
        title: doc.name,
        subtitle: doc.status === "EXPIRED" ? "Expired document" : "Document expiring soon",
        date: doc.expiryDate,
        href: "/documents",
        severity: doc.status === "EXPIRED" ? "danger" : "warning",
      });
    }
  }

  if (canAccess(ctx, "EXPENSES")) {
    const expenses = await db.expense.findMany({
      where: {
        ...expenseEntityFilter(ctx),
        status: { in: ["PENDING", "OVERDUE"] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        dueDate: true,
        amount: true,
        currency: true,
      },
      orderBy: { dueDate: "asc" },
      take: 20,
    });

    const pendingCount = await db.expense.count({
      where: {
        ...expenseEntityFilter(ctx),
        status: { in: ["PENDING", "OVERDUE"] },
      },
    });

    moduleSummaries.push({
      module: "EXPENSES",
      label: "Expenses",
      href: "/expenses",
      count: pendingCount,
      detail: pendingCount ? "Pending or overdue" : "All paid",
    });

    for (const expense of expenses) {
      reminders.push({
        id: "expense-" + expense.id,
        kind: "expense",
        title: expense.title,
        subtitle: expense.status === "OVERDUE" ? "Overdue payment" : "Upcoming payment",
        date: expense.dueDate,
        href: "/expenses",
        severity: expense.status === "OVERDUE" ? "danger" : "warning",
      });
    }
  }

  reminders.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.getTime() - b.date.getTime();
  });

  const portfolioTotals = mapToTotals(portfolioMap);
  const liabilityTotals = mapToTotals(liabilityMap);

  return {
    portfolioTotals,
    liabilityTotals,
    netWorthTotals: subtractTotals(portfolioTotals, liabilityTotals),
    activeAssetCount,
    reminderCount: reminders.length,
    categoryBreakdown: [...categoryMap.entries()]
      .map(([category, data]) => ({
        category,
        label: ASSET_CATEGORY_LABELS[category] ?? category,
        count: data.count,
        totals: mapToTotals(data.totals),
      }))
      .sort((a, b) => {
        const aTotal = a.totals.reduce((sum, t) => sum + t.amount, 0);
        const bTotal = b.totals.reduce((sum, t) => sum + t.amount, 0);
        return bTotal - aTotal;
      }),
    moduleSummaries,
    reminders: reminders.slice(0, 12),
  };
}

export function formatCurrencyTotals(totals: CurrencyTotal[]): string {
  if (totals.length === 0) return "—";
  return totals
    .map(({ currency, amount }) =>
      new Intl.NumberFormat("en-OM", {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount),
    )
    .join(" · ");
}
