"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SerializedPeCompany } from "@/lib/pe/serialize";
import { PeOverviewTab } from "@/components/pe/pe-overview-tab";
import { PeInvestmentsTab } from "@/components/pe/pe-investments-tab";
import { PeCapTableTab } from "@/components/pe/pe-cap-table-tab";
import { PeValuationsTab } from "@/components/pe/pe-valuations-tab";
import { PeDistributionsTab } from "@/components/pe/pe-distributions-tab";
import { PeExitTab } from "@/components/pe/pe-exit-tab";
import { PeContactsTab } from "@/components/pe/pe-contacts-tab";
import { PeGovernanceTab } from "@/components/pe/pe-governance-tab";
import { PeMonitoringTab } from "@/components/pe/pe-monitoring-tab";
import { PeDocumentsTab } from "@/components/pe/pe-documents-tab";
import type { FileAccessContext } from "@/lib/files/download-types";

const TAB_ITEMS = [
  { value: "overview", label: "Overview" },
  { value: "investments", label: "Investments" },
  { value: "cap-table", label: "Cap Table" },
  { value: "valuations", label: "Valuations" },
  { value: "distributions", label: "Distributions" },
  { value: "exit", label: "Exit" },
  { value: "contacts", label: "Contacts" },
  { value: "governance", label: "Governance" },
  { value: "monitoring", label: "Monitoring" },
  { value: "documents", label: "Documents" },
] as const;

export function PeCompanyHub({
  company,
  canEdit,
  defaultTab = "overview",
  fileAccess,
}: {
  company: SerializedPeCompany;
  canEdit: boolean;
  defaultTab?: string;
  fileAccess: FileAccessContext;
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
        <PeOverviewTab company={company} />
      </TabsContent>
      <TabsContent value="investments" className="mt-4">
        <PeInvestmentsTab company={company} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="cap-table" className="mt-4">
        <PeCapTableTab company={company} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="valuations" className="mt-4">
        <PeValuationsTab company={company} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="distributions" className="mt-4">
        <PeDistributionsTab company={company} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="exit" className="mt-4">
        <PeExitTab company={company} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="contacts" className="mt-4">
        <PeContactsTab company={company} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="governance" className="mt-4">
        <PeGovernanceTab company={company} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="monitoring" className="mt-4">
        <PeMonitoringTab company={company} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="documents" className="mt-4">
        <PeDocumentsTab company={company} canEdit={canEdit} fileAccess={fileAccess} />
      </TabsContent>
    </Tabs>
  );
}
