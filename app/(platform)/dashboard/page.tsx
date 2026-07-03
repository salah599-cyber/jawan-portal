import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, formatOmr } from "@/lib/format";
import { getDashboardSummary } from "@/lib/data/dashboard";
import { requireModuleAccess } from "@/lib/permissions/access";
import { EXIT_TYPE_LABELS } from "@/lib/labels";
import { formatUserName } from "@/lib/proposals/users";
import {
  ArrowRight,
  Building2,
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
};

export default async function DashboardPage() {
  const ctx = await requireModuleAccess("DASHBOARD");
  const summary = await getDashboardSummary(ctx);

  const portfolioDisplay = formatOmr(summary.portfolioTotalOmr);
  const netWorthDisplay = formatOmr(summary.netWorthTotalOmr);
  const hasPortfolio = summary.portfolioTotalOmr > 0;

  return (
    <>
      <PlatformHeader title="Dashboard" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Portfolio Value"
            value={portfolioDisplay}
            detail={
              hasPortfolio
                ? "Active & monitored assets, converted to OMR"
                : "Add assets to track portfolio value"
            }
          />
          <MetricCard
            label="Net Worth"
            value={netWorthDisplay}
            detail={
              summary.liabilityTotals.length
                ? "Portfolio minus liabilities, converted to OMR"
                : hasPortfolio
                  ? "No active liabilities recorded"
                  : "Calculated from assets and liabilities"
            }
          />
          <MetricCard
            label="Active Assets"
            value={summary.activeAssetCount.toString()}
            detail={
              summary.moduleSummaries.find((m) => m.module === "ASSETS")
                ? summary.moduleSummaries.find((m) => m.module === "ASSETS")!.count + " total in portfolio"
                : "Assets module not accessible"
            }
          />
          <MetricCard
            label="Pending Reminders"
            value={summary.reminderCount.toString()}
            detail={
              summary.reminderCount
                ? "Documents, expenses, and vehicle renewals"
                : "No upcoming items need attention"
            }
            highlight={summary.reminderCount > 0}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Portfolio Overview</CardTitle>
              <CardDescription>Value breakdown by asset class</CardDescription>
            </CardHeader>
            <CardContent>
              {!hasPortfolio ? (
                <p className="text-sm text-muted-foreground">
                  No asset values recorded yet. Register assets, lands, or cars to populate this view.
                </p>
              ) : (
                <div className="space-y-4">
                  {summary.categoryBreakdown.map((item) => {
                    const primaryTotal = item.totals[0];
                    const maxTotal = summary.categoryBreakdown[0]?.totals[0]?.amount ?? 1;
                    const barWidth = primaryTotal
                      ? Math.max(4, Math.round((primaryTotal.amount / maxTotal) * 100))
                      : 0;

                    return (
                      <div key={item.category} className="space-y-2">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="text-muted-foreground">{item.count} asset{item.count === 1 ? "" : "s"}</p>
                          </div>
                          <p className="font-medium">
                            {item.totals.map((t) => formatMoney(t.amount, t.currency)).join(" · ")}
                          </p>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary transition-all"
                            style={{ width: barWidth + "%" }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

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
                Expiring documents, vehicle renewals, and upcoming or overdue expenses
              </CardDescription>
            </div>
            {summary.reminderCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                {summary.moduleSummaries.some((m) => m.module === "DOCUMENTS") ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/documents">Documents</Link>
                  </Button>
                ) : null}
                {summary.moduleSummaries.some((m) => m.module === "CARS") ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/cars">Cars</Link>
                  </Button>
                ) : null}
                {summary.moduleSummaries.some((m) => m.module === "EXPENSES") ? (
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/expenses">Expenses</Link>
                  </Button>
                ) : null}
              </div>
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
                          {item.kind === "document"
                            ? "Document"
                            : item.kind === "expense"
                              ? "Expense"
                              : "Vehicle"}
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

function MetricCard({
  label,
  value,
  detail,
  highlight = false,
}: {
  label: string;
  value: string;
  detail: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-amber-500/50" : undefined}>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}
