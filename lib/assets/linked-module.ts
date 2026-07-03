type LinkedAsset = {
  landParcel?: { id: string } | null;
  vehicle?: { id: string } | null;
  registeredCompany?: { id: string } | null;
  peCompany?: { id: string } | null;
  lpCommitment?: { id: string } | null;
  reProperty?: { id: string } | null;
};

export type AssetLinkedModule = {
  label: string;
  href: string;
  manageFrom: string;
};

export function getAssetLinkedModule(asset: LinkedAsset): AssetLinkedModule | null {
  if (asset.landParcel) {
    return { label: "Lands", href: `/lands/${asset.landParcel.id}`, manageFrom: "Lands" };
  }
  if (asset.vehicle) {
    return { label: "Cars", href: `/cars/${asset.vehicle.id}`, manageFrom: "Cars" };
  }
  if (asset.registeredCompany) {
    return {
      label: "Companies",
      href: `/companies/${asset.registeredCompany.id}`,
      manageFrom: "Companies",
    };
  }
  if (asset.peCompany) {
    return {
      label: "PE / VC Portfolio",
      href: `/portfolio/pe/${asset.peCompany.id}`,
      manageFrom: "PE / VC Portfolio",
    };
  }
  if (asset.lpCommitment) {
    return {
      label: "Fund LP Investments",
      href: `/portfolio/fund-lp/${asset.lpCommitment.id}`,
      manageFrom: "Fund LP Investments",
    };
  }
  if (asset.reProperty) {
    return {
      label: "Real Estate",
      href: `/real-estate/${asset.reProperty.id}`,
      manageFrom: "Real Estate",
    };
  }
  return null;
}

export function isModuleManagedAsset(asset: LinkedAsset) {
  return getAssetLinkedModule(asset) != null;
}
