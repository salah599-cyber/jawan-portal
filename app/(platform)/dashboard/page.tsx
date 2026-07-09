import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { parsePerformancePeriod } from "@/lib/portfolio/performance-period";
import { canAccess, requireModuleAccess } from "@/lib/permissions/access";
import { DashboardWealthCards } from "@/components/dashboard/dashboard-wealth-cards";
import { DashboardAssetAllocationChart } from "@/components/dashboard/dashboard-asset-allocation-chart";
import { DashboardCurrencyAllocationChart } from "@/components/dashboard/dashboard-currency-allocation-chart";
import { DashboardNetWorthTrendChart } from "@/components/dashboard/dashboard-net-worth-trend-chart";
import { DashboardPerformanceCards } from "@/components/dashboard/dashboard-performance-cards";
import { EXIT_TYPE_LABELS } from "@/lib/labels";
import { formatUserName } from "@/lib/proposals/users";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Car,
  Factory,
  HandCoins,
  Banknote,
  FileText,
  Landmark,
  Map,
  Receipt,
  Wallet,
  Lightbulb,
  Briefcase,
  Home,
} from "lucide-react";

const MODULE_ICONS: Record<string, typeof Building2> = {
  ASSETS: Building2,
  BANK: Landmark,
  LIABILITIES: Wallet,
  LANDS: Map,
  REAL_ESTATE: Home,
  CARS: Car,
  COMPANIES: Factory,
  PRIVATE_EQUITY: Briefcase,
  LOANS: HandCoins,
  CHEQUES: Banknote,
  CASH_MANAGEMENT: Wallet,
  PROPOSALS: Lightbulb,
  DOCUMENTS: FileText,
  EXPENSES: Receipt,
  CALENDAR: CalendarDays,
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const ctx = await requireModuleAccess("DASHBOARD");
  const { period: periodParam } = await searchParams;
  const performancePeriod = parsePerformancePeriod(periodParam);
  const summary = await getDashboardSummary(ctx, { performancePeriod });

  const hasPortfolio = summary.portfolioTotalOmr > 0;
  const hasLiabilities = summary.liabilityTotals.length > 0;
  const includesCashBalances = canAccess(ctx, "CASH_MANAGEMENT");

  return (
    <>
      <PlatformHeader title="Dashboard" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <DashboardWealthCards
          portfolioTotalOmr={summary.portfolioTotalOmr}
          netWorthTotalOmr={summary.netWorthTotalOmr}
          hasPortfolio={hasPortfolio}
          hasLiabilities={hasLiabilities}
          includesCashBalances={includesCashBalances}
          activeAssetCount={summary.activeAssetCount}
          activeAssetDetail={
            summary.moduleSummaries.find((m) => m.module === "ASSETS")
              ? summary.moduleSummaries.find((m) => m.module === "ASSETS")!.count + " total in portfolio"
              : "Assets module not accessible"
          }
          reminderCount={summary.reminderCount}
          reminderDetail={
            summary.reminderCount
              ? "Unified calendar deadlines and tasks"
              : "No upcoming items need attention"
          }
        />

        <DashboardPerformanceCards
          performance={summary.portfolioPerformance}
          hasPortfolio={hasPortfolio}
        />


        {summary.netWorthTrend ? (
          <DashboardNetWorthTrendChart trend={summary.netWorthTrend} />
        ) : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Asset Allocation</CardTitle>
                <CardDescription>
                  Portfolio breakdown by asset class
                  {includesCashBalances ? " · includes synced bank balances" : ""}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!hasPortfolio ? (
                  <p className="text-sm text-muted-foreground">
                    No asset values recorded yet. Register assets, lands, or cars to populate this view.
                  </p>
                ) : (
                  <DashboardAssetAllocationChart
                    slices={summary.allocationSlices}
                    totalOmr={summary.portfolioTotalOmr}
                    includesCashBalances={includesCashBalances}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Currency Allocation</CardTitle>
                <CardDescription>Portfolio breakdown by currency (OMR-weighted)</CardDescription>
              </CardHeader>
              <CardContent>
                {!hasPortfolio ? (
                  <p className="text-sm text-muted-foreground">
                    No asset values recorded yet. Register assets, lands, or cars to populate this view.
                  </p>
                ) : (
                  <DashboardCurrencyAllocationChart
                    slices={summary.currencyAllocationSlices}
                    totalOmr={summary.portfolioTotalOmr}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Modules</CardTitle>
              <CardDescription>Quick access across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.moduleSummaries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No module data available for your role.</p>
              ) : (
                summary.moduleSummaries.map((item) => {
                  const Icon = MODULE_ICONS[item.module] ?? Building2;
                  return (
                    <Link
                      key={item.module}
                      href={item.href}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-md bg-muted p-2">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          {item.detail ? (
                            <p className="text-xs text-muted-foreground">{item.detail}</p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold">{item.count}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </Link>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {summary.recentExits.length > 0 ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Recent Exits</CardTitle>
                <CardDescription>Asset disposals in the last 12 months</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/assets?filter=exited">View all exited</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {summary.recentExits.map((exit) => (
                  <li key={exit.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{exit.asset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {EXIT_TYPE_LABELS[exit.exitType] ?? exit.exitType}
                        {" · "}
                        {exit.asset.entity.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatMoney(exit.proceeds, exit.currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">{formatDate(exit.exitDate)}</span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={"/assets/" + exit.asset.id}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {summary.pendingProposals.length > 0 ? (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Pending Proposal Approvals</CardTitle>
                <CardDescription>Investment proposals awaiting your review</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/proposals?filter=pending-approval">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {summary.pendingProposals.map((proposal) => (
                  <li key={proposal.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium">{proposal.name}</p>
                      <p className="text-xs text-muted-foreground">
                        From {formatUserName(proposal.submittedBy)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatMoney(proposal.suggestedAmount, proposal.currency)}
                      </span>
                      <span className="text-sm text-muted-foreground">{formatDate(proposal.submittedAt)}</span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={"/proposals/" + proposal.id}>Review</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Reminders</CardTitle>
              <CardDescription>
                Upcoming deadlines and tasks from the unified calendar
              </CardDescription>
            </div>
            {summary.reminderCount > 0 ? (
              <Button variant="outline" size="sm" asChild>
                <Link href="/calendar">View calendar</Link>
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {summary.reminders.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing needs attention right now.</p>
            ) : (
              <ul className="divide-y">
                {summary.reminders.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge variant={item.severity === "danger" ? "destructive" : "secondary"}>
                          {item.kind}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{formatDate(item.date)}</span>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={item.href}>View</Link>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
