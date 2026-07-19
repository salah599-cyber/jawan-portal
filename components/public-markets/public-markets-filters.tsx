"use client";

import type { PublicMarket } from "@/lib/generated/prisma/client";
import type { EntityOption } from "@/components/platform/entity-select";
import { EntityFilterSelect } from "@/components/platform/entity-filter-select";
import { FilterToolbar } from "@/components/platform/filter-toolbar";
import type { SearchParamMap } from "@/components/platform/url-filter-select";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";
import {
  MARKET_CONFIG,
  PUBLIC_MARKET_ORDER,
  PUBLIC_MARKETS_PATH,
  PUBLIC_INSTRUMENT_SLUGS,
  slugFromMarket,
  type PublicInstrumentSlug,
  type PublicManagementSlug,
} from "@/lib/public-markets/constants";
import { PUBLIC_INSTRUMENT_TYPE_LABELS, PUBLIC_MANAGEMENT_TYPE_LABELS } from "@/lib/labels";

const INSTRUMENT_LABELS: Record<PublicInstrumentSlug, string> = {
  equity: PUBLIC_INSTRUMENT_TYPE_LABELS.EQUITY,
  options: PUBLIC_INSTRUMENT_TYPE_LABELS.OPTION,
  "structured-notes": PUBLIC_INSTRUMENT_TYPE_LABELS.STRUCTURED_NOTE,
  crypto: PUBLIC_INSTRUMENT_TYPE_LABELS.CRYPTO,
  all: "All instruments",
};

export function PublicMarketsFilters({
  activeMarket,
  activeInstrument,
  activeManagement = "all",
  showManagementFilter = false,
  entityId,
  entities,
  currentParams,
}: {
  activeMarket: PublicMarket | "ALL";
  activeInstrument: PublicInstrumentSlug;
  activeManagement?: PublicManagementSlug;
  showManagementFilter?: boolean;
  entityId?: string;
  entities: EntityOption[];
  currentParams: SearchParamMap;
}) {
  const marketValue = activeMarket === "ALL" ? "ALL" : slugFromMarket(activeMarket);
  const marketOptions = [
    { value: "ALL", label: "All Markets" },
    ...PUBLIC_MARKET_ORDER.map((market) => ({
      value: slugFromMarket(market),
      label: MARKET_CONFIG[market].shortLabel,
    })),
  ];
  const instrumentOptions = PUBLIC_INSTRUMENT_SLUGS.map((slug) => ({
    value: slug,
    label: INSTRUMENT_LABELS[slug],
  }));
  const managementOptions = [
    { value: "all", label: "All portfolios" },
    { value: "managed", label: PUBLIC_MANAGEMENT_TYPE_LABELS.managed },
    { value: "reference", label: PUBLIC_MANAGEMENT_TYPE_LABELS.reference },
  ];

  return (
    <FilterToolbar>
      <UrlFilterSelect
        label="Market"
        paramKey="market"
        value={marketValue}
        options={marketOptions}
        pathname={PUBLIC_MARKETS_PATH}
        currentParams={currentParams}
        preserveParams={["entity", "instrument", "management"]}
        triggerClassName="min-w-[11rem]"
      />
      <UrlFilterSelect
        label="Instrument"
        paramKey="instrument"
        value={activeInstrument}
        options={instrumentOptions}
        pathname={PUBLIC_MARKETS_PATH}
        currentParams={currentParams}
        preserveParams={["entity", "market", "management"]}
        omitWhenValue="equity"
        triggerClassName="min-w-[11rem]"
      />
      {showManagementFilter ? (
        <UrlFilterSelect
          label="Portfolio"
          paramKey="management"
          value={activeManagement}
          options={managementOptions}
          pathname={PUBLIC_MARKETS_PATH}
          currentParams={currentParams}
          preserveParams={["entity", "market", "instrument"]}
          omitWhenValue="all"
          triggerClassName="min-w-[11rem]"
        />
      ) : null}
      <EntityFilterSelect
        entities={entities}
        value={entityId}
        pathname={PUBLIC_MARKETS_PATH}
        currentParams={currentParams}
        preserveParams={["market", "instrument", "management"]}
        allowAll={false}
      />
    </FilterToolbar>
  );
}
