"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SerializedReProperty } from "@/lib/real-estate/serialize";
import { ReOverviewTab } from "@/components/real-estate/re-overview-tab";
import { ReUnitsTab } from "@/components/real-estate/re-units-tab";
import { ReRentTab } from "@/components/real-estate/re-rent-tab";
import { ReLeasesTab } from "@/components/real-estate/re-leases-tab";
import { ReMaintenanceTab } from "@/components/real-estate/re-maintenance-tab";
import { ReUtilitiesTab } from "@/components/real-estate/re-utilities-tab";
import { ReFinancialsTab } from "@/components/real-estate/re-financials-tab";
import { ReDocumentsTab } from "@/components/real-estate/re-documents-tab";
import type { FileAccessContext } from "@/lib/files/download-types";

const TAB_ITEMS = [
  { value: "overview", label: "Overview" },
  { value: "units", label: "Units" },
  { value: "rent", label: "Rent" },
  { value: "leases", label: "Leases" },
  { value: "maintenance", label: "Maintenance" },
  { value: "utilities", label: "Utilities" },
  { value: "financials", label: "Financials" },
  { value: "documents", label: "Documents" },
] as const;

export function RePropertyHub({
  property,
  canEdit,
  defaultTab = "overview",
  fileAccess,
}: {
  property: SerializedReProperty;
  canEdit: boolean;
  defaultTab?: string;
  fileAccess: FileAccessContext;
}) {
  const validTab = TAB_ITEMS.some((item) => item.value === defaultTab) ? defaultTab : "overview";
  const [tab, setTab] = useState(validTab);

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
        <ReOverviewTab property={property} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="units" className="mt-4">
        <ReUnitsTab property={property} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="rent" className="mt-4">
        <ReRentTab property={property} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="leases" className="mt-4">
        <ReLeasesTab property={property} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="maintenance" className="mt-4">
        <ReMaintenanceTab property={property} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="utilities" className="mt-4">
        <ReUtilitiesTab property={property} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="financials" className="mt-4">
        <ReFinancialsTab property={property} canEdit={canEdit} />
      </TabsContent>
      <TabsContent value="documents" className="mt-4">
        <ReDocumentsTab property={property} canEdit={canEdit} fileAccess={fileAccess} />
      </TabsContent>
    </Tabs>
  );
}
