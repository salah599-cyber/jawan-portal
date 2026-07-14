export type OwnershipStakeInput = {
  entityId?: string;
  assetId?: string;
  landParcelId?: string;
  registeredCompanyId?: string;
  rePropertyId?: string;
  vehicleId?: string;
  stakeType?: string;
  ownershipPct?: string;
  roleLabel?: string;
  notes?: string;
};

export type SignatoryRoleInput = {
  entityId: string;
  registeredCompanyId?: string;
  assetId?: string;
  vehicleId?: string;
  roleType?: string;
  bankName?: string;
  accountRef?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  isActive?: boolean;
  notes?: string;
};

export type BeneficiaryDesignationInput = {
  insurancePolicyId?: string;
  assetId?: string;
  landParcelId?: string;
  registeredCompanyId?: string;
  rePropertyId?: string;
  vehicleId?: string;
  designationType?: string;
  allocationPct?: string;
  effectiveDate?: string;
  notes?: string;
};

export type FamilyEmailInput = {
  email: string;
  label?: string;
};

export type FamilyPhoneInput = {
  phone: string;
  label?: string;
};
