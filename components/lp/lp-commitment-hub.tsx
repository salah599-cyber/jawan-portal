"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SerializedLpCommitment } from "@/lib/lp/serialize";
import { LpOverviewTab } from "@/components/lp/lp-overview-tab";
import { LpCapitalCallsTab } from "@/components/lp/lp-capital-calls-tab";
import { LpDistributionsTab } from "@/components/lp/lp-distributions-tab";
import { LpNavUpdatesTab } from "@/components/lp/lp-nav-updates-tab";
import { LpFundDetailsTab } from "@/components/lp/lp-fund-details-tab";
import { LpDocumentsTab } from "@/components/lp/lp-documents-tab";

const TAB_ITEMS = [
  { value: "overview", label: "Overview" },
  { value: "capital-calls", label: "Capital Calls" },
  { value: "distributions", label: "Distributions" },
  { value: "nav", label: "NAV Updates" },
  { value: "fund", label: "Fund Details" },
  { value: "documents", label: "Documents" },
] as const;

export function LpCommitmentHub({
  commitment,
  canEdit,
  defaultTab = "overview",
}: {
  commitment: SerializedLpCommitment;
  canEdit: boolean;
  defaultTab?: string;
}) {
  const [tab, setTab] = useState(defaultTab);

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        {TAB_ITEMS.map((item) => (
          <TabsTrigger key={item.value} value={item.value} className="text-xs sm:text-sm">
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        <LpOverviewTab commitment={commitment} />
      </TabsContent>
      <TabsContent value="capital-calls" className="mt-4">
        <LpCapitalCallsTab commitment={commitment} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="distributions" className="mt-4">
        <LpDistributionsTab commitment={commitment} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="nav" className="mt-4">
        <LpNavUpdatesTab commitment={commitment} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="fund" className="mt-4">
        <LpFundDetailsTab commitment={commitment} />
      </TabsContent>
      <TabsContent value="documents" className="mt-4">
        <LpDocumentsTab commitment={commitment} canEdit={canEdit} />
      </TabsContent>
    </Tabs>
  );
}
