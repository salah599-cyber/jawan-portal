"use client";

import { FilterToolbar } from "@/components/platform/filter-toolbar";
import type { SearchParamMap } from "@/components/platform/url-filter-select";
import { UrlFilterSelect } from "@/components/platform/url-filter-select";
import { FAMILY_KYC_STATUS_LABELS, FAMILY_RELATIONSHIP_LABELS } from "@/lib/labels";

export function FamilyMembersFilters({
  relationship,
  kyc,
  beneficiariesOnly,
  currentParams,
}: {
  relationship?: string;
  kyc?: string;
  beneficiariesOnly: boolean;
  currentParams: SearchParamMap;
}) {
  const relationshipOptions = [
    { value: "all", label: "All relationships" },
    ...Object.entries(FAMILY_RELATIONSHIP_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];
  const kycOptions = [
    { value: "all", label: "All KYC statuses" },
    ...Object.entries(FAMILY_KYC_STATUS_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
  ];
  const beneficiaryOptions = [
    { value: "all", label: "All members" },
    { value: "1", label: "Beneficiaries only" },
  ];

  return (
    <FilterToolbar>
      <UrlFilterSelect
        label="Relationship"
        paramKey="relationship"
        value={relationship ?? "all"}
        options={relationshipOptions}
        pathname="/family/members"
        currentParams={currentParams}
        preserveParams={["kyc", "beneficiaries"]}
        omitWhenValue="all"
        triggerClassName="min-w-[11rem]"
      />
      <UrlFilterSelect
        label="KYC"
        paramKey="kyc"
        value={kyc ?? "all"}
        options={kycOptions}
        pathname="/family/members"
        currentParams={currentParams}
        preserveParams={["relationship", "beneficiaries"]}
        omitWhenValue="all"
        triggerClassName="min-w-[11rem]"
      />
      <UrlFilterSelect
        label="Beneficiaries"
        paramKey="beneficiaries"
        value={beneficiariesOnly ? "1" : "all"}
        options={beneficiaryOptions}
        pathname="/family/members"
        currentParams={currentParams}
        preserveParams={["relationship", "kyc"]}
        omitWhenValue="all"
      />
    </FilterToolbar>
  );
}
