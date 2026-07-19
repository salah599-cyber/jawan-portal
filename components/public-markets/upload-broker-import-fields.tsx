"use client";

import { useState } from "react";
import type { PublicBrokerAccountRow } from "@/lib/public-markets/broker-accounts";
import { BrokerAccountSelect } from "@/components/public-markets/broker-account-select";
import { PortfolioManagementField } from "@/components/public-markets/portfolio-management-field";

export function UploadBrokerImportFields({
  entityId,
  brokerAccountId,
  onBrokerAccountIdChange,
}: {
  entityId: string;
  brokerAccountId: string;
  onBrokerAccountIdChange: (value: string) => void;
}) {
  const [isManaged, setIsManaged] = useState(true);
  const [overrideManaged, setOverrideManaged] = useState(false);

  function handleAccountSelected(account: PublicBrokerAccountRow | null) {
    if (!overrideManaged && account) {
      setIsManaged(account.isManaged);
    }
  }

  return (
    <>
      <BrokerAccountSelect
        entityId={entityId}
        value={brokerAccountId}
        onValueChange={(value) => {
          setOverrideManaged(false);
          onBrokerAccountIdChange(value);
        }}
        onAccountSelected={handleAccountSelected}
      />

      <PortfolioManagementField
        value={isManaged}
        onChange={(value) => {
          setOverrideManaged(true);
          setIsManaged(value);
        }}
      />

      <input type="hidden" name="isManaged" value={isManaged ? "true" : "false"} />
    </>
  );
}
