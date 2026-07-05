"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deletePrivateBeneficiary,
  deletePrivatePropertyDocument,
  deletePrivateStaff,
  linkPrivateMortgage,
  uploadPrivatePropertyDocuments,
  upsertPrivateBeneficiary,
  upsertPrivateRunningCost,
  upsertPrivateStaff,
} from "@/lib/actions/private-real-estate";
import { formatDate, formatOmr } from "@/lib/format";
import {
  RE_PRIVATE_COST_CATEGORY_LABELS,
  RE_PRIVATE_DOCUMENT_TYPE_LABELS,
  RE_PRIVATE_STAFF_ARRANGEMENT_LABELS,
  RE_PRIVATE_STAFF_ROLE_LABELS,
} from "@/lib/labels";
import type { SerializedPrivateProperty } from "@/lib/real-estate/serialize-private";

const TAB_ITEMS = [
  { value: "overview", label: "Overview" },
  { value: "physical", label: "Physical" },
  { value: "costs", label: "Running Costs" },
  { value: "staff", label: "Staff" },
  { value: "financials", label: "Financials" },
  { value: "documents", label: "Documents" },
  { value: "succession", label: "Succession" },
] as const;

export function RePrivatePropertyHub({
  property,
  canEdit,
  mortgageOptions,
  familyMembers,
  defaultTab = "overview",
}: {
  property: SerializedPrivateProperty;
  canEdit: boolean;
  mortgageOptions: {
    id: string;
    name: string;
    lender: string | null;
    outstandingBalance: string | null;
    amount: string;
    currency: string;
  }[];
  familyMembers: { id: string; fullName: string; preferredName: string | null }[];
  defaultTab?: string;
}) {
  const validTab = TAB_ITEMS.some((item) => item.value === defaultTab) ? defaultTab : "overview";
  const [tab, setTab] = useState(validTab);
  const detail = property.detail;

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        {TAB_ITEMS.map((item) => (
          <TabsTrigger key={item.value} value={item.value} className="text-xs sm:text-sm">
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview" className="mt-4 space-y-4">
        {property.ownerDiscrepancy ? (
          <Badge variant="destructive">
            Registered and beneficial owners differ — review for estate planning
          </Badge>
        ) : null}
        <DetailGrid
          items={[
            ["Entity", property.entityName],
            ["Title deed", detail?.titleDeedNumber ?? "—"],
            ["Registered owner", detail?.registeredOwner ?? "—"],
            ["Beneficial owner", detail?.beneficialOwner ?? "—"],
            ["Location", [property.streetAddress, property.area, property.wilayat, property.governorate].filter(Boolean).join(", ") || "—"],
            ["Plot / parcel", [property.plotNumber, property.parcelNumber].filter(Boolean).join(" / ") || "—"],
            ["Purchase", property.purchasePriceOmr ? `${formatOmr(Number(property.purchasePriceOmr))} on ${formatDate(property.purchaseDate)}` : "—"],
            ["Valuation", property.currentValuationOmr ? `${formatOmr(Number(property.currentValuationOmr))} (${formatDate(property.lastValuationDate)})` : "—"],
            ["Monthly running costs", formatOmr(property.monthlyRunningCostOmr)],
          ]}
        />
        {property.googleMapsUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={property.googleMapsUrl} target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          </Button>
        ) : null}
      </TabsContent>

      <TabsContent value="physical" className="mt-4">
        <DetailGrid
          items={[
            ["Land area", property.landAreaSqm ? `${property.landAreaSqm} sqm` : "—"],
            ["Built-up area", property.builtUpAreaSqm ? `${property.builtUpAreaSqm} sqm` : "—"],
            ["Floors", property.numFloors?.toString() ?? "—"],
            ["Bedrooms", detail?.numBedrooms?.toString() ?? "—"],
            ["Bathrooms", detail?.numBathrooms?.toString() ?? "—"],
            ["Parking", detail?.numParkingSpaces?.toString() ?? "—"],
            ["Construction", detail?.constructionType ?? "—"],
            ["Finishing", detail?.finishingQuality ?? "—"],
            ["Furnishing", detail?.furnishingStatus ?? "—"],
            ["Condition", detail?.condition ?? "—"],
            ["Pool", detail?.hasPool ? "Yes" : "No"],
            ["Garden", detail?.hasGardenLandscaping ? "Yes" : "No"],
            ["Smart home", detail?.hasSmartHome ? "Yes" : "No"],
            ["Last renovation", detail?.lastRenovationDate ? `${formatDate(detail.lastRenovationDate)} (${formatOmr(Number(detail.lastRenovationCostOmr ?? 0))})` : "—"],
          ]}
        />
      </TabsContent>

      <TabsContent value="costs" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Estimated monthly total: {formatOmr(property.monthlyRunningCostOmr)}
            </CardTitle>
          </CardHeader>
        </Card>
        {property.runningCosts.map((cost) => (
          <RunningCostCard key={cost.id} propertyId={property.id} cost={cost} canEdit={canEdit} />
        ))}
      </TabsContent>

      <TabsContent value="staff" className="mt-4 space-y-4">
        {property.staff.map((member) => (
          <StaffCard key={member.id} propertyId={property.id} member={member} canEdit={canEdit} />
        ))}
        {canEdit ? <StaffForm propertyId={property.id} /> : null}
      </TabsContent>

      <TabsContent value="financials" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mortgage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {property.liability ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{property.liability.name}</p>
                <p className="text-muted-foreground">
                  Outstanding: {formatOmr(Number(property.liability.outstandingBalance ?? 0))}{" "}
                  {property.liability.lender ? `· ${property.liability.lender}` : ""}
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/loans/${property.liability.id}`}>View loan</Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                {property.mortgageBank
                  ? `Inline: ${property.mortgageBank} — ${formatOmr(Number(property.mortgageOutstandingOmr ?? 0))} outstanding`
                  : "No mortgage linked."}
              </p>
            )}
            {canEdit ? (
              <MortgageLinkForm
                propertyId={property.id}
                mortgageOptions={mortgageOptions}
                currentId={property.liabilityId}
              />
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Valuation history</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {property.valuations.length === 0 ? (
              <p className="text-muted-foreground">No valuations recorded.</p>
            ) : (
              property.valuations.map((valuation) => (
                <div key={valuation.id} className="flex justify-between border-b py-2 last:border-0">
                  <span>{formatDate(valuation.valuationDate)}</span>
                  <span>{formatOmr(Number(valuation.valueOmr ?? 0))}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="documents" className="mt-4 space-y-4">
        {property.documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
            <div>
              <p className="font-medium">{doc.fileName}</p>
              <p className="text-muted-foreground">
                {RE_PRIVATE_DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                  View
                </a>
              </Button>
              {canEdit ? (
                <DeleteButton
                  label="Delete"
                  onConfirm={() => deletePrivatePropertyDocument(property.id, doc.id)}
                />
              ) : null}
            </div>
          </div>
        ))}
        {canEdit ? <DocumentUploadForm propertyId={property.id} /> : null}
      </TabsContent>

      <TabsContent value="succession" className="mt-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Designated inheritors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {property.beneficiaryDesignations.map((designation) => (
              <div key={designation.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                <div>
                  <p className="font-medium">{designation.familyMemberName}</p>
                  {designation.allocationPct ? (
                    <p className="text-muted-foreground">{designation.allocationPct}%</p>
                  ) : null}
                  {designation.notes ? (
                    <p className="text-muted-foreground">{designation.notes}</p>
                  ) : null}
                </div>
                {canEdit ? (
                  <DeleteButton
                    label="Remove"
                    onConfirm={() => deletePrivateBeneficiary(property.id, designation.id)}
                  />
                ) : null}
              </div>
            ))}
            {canEdit ? (
              <BeneficiaryForm propertyId={property.id} familyMembers={familyMembers} />
            ) : null}
          </CardContent>
        </Card>
        {detail?.wasiyyaConditions ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Wasiyya conditions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{detail.wasiyyaConditions}</CardContent>
          </Card>
        ) : null}
        {property.successionLinks.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linked succession plans</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {property.successionLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between">
                  <span>{link.planTitle ?? "Estate plan"}</span>
                  {link.planId ? (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/family/succession/${link.planId}`}>View plan</Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}
        <Button variant="outline" size="sm" asChild>
          <Link href="/family/succession">Open Succession module</Link>
        </Button>
      </TabsContent>
    </Tabs>
  );
}

function DetailGrid({ items }: { items: [string, string][] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium">{value}</p>
        </div>
      ))}
    </div>
  );
}

function RunningCostCard({
  propertyId,
  cost,
  canEdit,
}: {
  propertyId: string;
  cost: SerializedPrivateProperty["runningCosts"][number];
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {RE_PRIVATE_COST_CATEGORY_LABELS[cost.category] ?? cost.category}
        </CardTitle>
      </CardHeader>
      {canEdit ? (
        <CardContent>
          <form
            className="grid gap-3 md:grid-cols-3"
            action={(formData) => {
              startTransition(() => upsertPrivateRunningCost(propertyId, formData));
            }}
          >
            <input type="hidden" name="category" value={cost.category} />
            <Field label="Provider" name="provider" defaultValue={cost.provider ?? ""} />
            <Field label="Meter #" name="meterNumber" defaultValue={cost.meterNumber ?? ""} />
            <Field label="Account #" name="accountNumber" defaultValue={cost.accountNumber ?? ""} />
            <Field label="Monthly (OMR)" name="monthlyCostOmr" type="number" defaultValue={cost.monthlyCostOmr ?? ""} />
            <Field label="Annual (OMR)" name="annualCostOmr" type="number" defaultValue={cost.annualCostOmr ?? ""} />
            <Field label="Payment status" name="paymentStatus" defaultValue={cost.paymentStatus ?? ""} />
            <div className="md:col-span-3">
              <Label htmlFor={`notes-${cost.id}`}>Notes</Label>
              <Textarea id={`notes-${cost.id}`} name="notes" defaultValue={cost.notes ?? ""} rows={2} />
            </div>
            <Button type="submit" size="sm" disabled={pending}>
              Save
            </Button>
          </form>
        </CardContent>
      ) : (
        <CardContent className="text-sm text-muted-foreground">
          Monthly: {cost.monthlyCostOmr ?? "—"} · Annual: {cost.annualCostOmr ?? "—"}
        </CardContent>
      )}
    </Card>
  );
}

function StaffCard({
  propertyId,
  member,
  canEdit,
}: {
  propertyId: string;
  member: SerializedPrivateProperty["staff"][number];
  canEdit: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-6 text-sm">
        <div>
          <p className="font-medium">{member.fullName}</p>
          <p className="text-muted-foreground">
            {RE_PRIVATE_STAFF_ROLE_LABELS[member.role] ?? member.role}
            {member.arrangement
              ? ` · ${RE_PRIVATE_STAFF_ARRANGEMENT_LABELS[member.arrangement] ?? member.arrangement}`
              : ""}
          </p>
          <p className="text-muted-foreground">
            Visa: {formatDate(member.visaExpiry)} · Contract: {formatDate(member.contractExpiry)}
          </p>
          {member.monthlySalaryOmr ? (
            <p>{formatOmr(Number(member.monthlySalaryOmr))}/month</p>
          ) : null}
        </div>
        {canEdit ? (
          <DeleteButton label="Remove" onConfirm={() => deletePrivateStaff(propertyId, member.id)} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function StaffForm({ propertyId }: { propertyId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Add staff member</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 md:grid-cols-2"
          action={(formData) => startTransition(() => upsertPrivateStaff(propertyId, formData))}
        >
          <Field label="Full name" name="fullName" required />
          <Field label="Nationality" name="nationality" />
          <Field label="ID number" name="idNumber" />
          <SelectField label="Role" name="role" options={RE_PRIVATE_STAFF_ROLE_LABELS} />
          <SelectField label="Arrangement" name="arrangement" options={RE_PRIVATE_STAFF_ARRANGEMENT_LABELS} />
          <Field label="Monthly salary (OMR)" name="monthlySalaryOmr" type="number" />
          <Field label="Visa expiry" name="visaExpiry" type="date" />
          <Field label="Contract expiry" name="contractExpiry" type="date" />
          <Button type="submit" size="sm" disabled={pending}>
            Add staff
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function MortgageLinkForm({
  propertyId,
  mortgageOptions,
  currentId,
}: {
  propertyId: string;
  mortgageOptions: { id: string; name: string }[];
  currentId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      action={(formData) => {
        const liabilityId = String(formData.get("liabilityId") ?? "");
        startTransition(() => linkPrivateMortgage(propertyId, liabilityId || null));
      }}
    >
      <div>
        <Label htmlFor="liabilityId">Link mortgage from Loans</Label>
        <select
          id="liabilityId"
          name="liabilityId"
          defaultValue={currentId ?? ""}
          className="flex h-9 min-w-[240px] rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        >
          <option value="">None</option>
          {mortgageOptions.map((loan) => (
            <option key={loan.id} value={loan.id}>
              {loan.name}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Update link
      </Button>
    </form>
  );
}

function DocumentUploadForm({ propertyId }: { propertyId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload document</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          action={(formData) => startTransition(() => uploadPrivatePropertyDocuments(propertyId, formData))}
        >
          <SelectField label="Type" name="documentType" options={RE_PRIVATE_DOCUMENT_TYPE_LABELS} />
          <div>
            <Label htmlFor="files">Files</Label>
            <Input id="files" name="files" type="file" multiple required />
          </div>
          <Button type="submit" size="sm" disabled={pending}>
            Upload
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function BeneficiaryForm({
  propertyId,
  familyMembers,
}: {
  propertyId: string;
  familyMembers: { id: string; fullName: string; preferredName: string | null }[];
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      action={(formData) => startTransition(() => upsertPrivateBeneficiary(propertyId, formData))}
    >
      <div>
        <Label htmlFor="familyMemberId">Family member</Label>
        <select
          id="familyMemberId"
          name="familyMemberId"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
        >
          <option value="">Select…</option>
          {familyMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.preferredName ?? member.fullName}
            </option>
          ))}
        </select>
      </div>
      <Field label="Allocation %" name="allocationPct" type="number" />
      <div className="md:col-span-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Add inheritor
      </Button>
    </form>
  );
}

function DeleteButton({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => onConfirm())}
    >
      {label}
    </Button>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} required={required} />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
  defaultValue,
}: {
  label: string;
  name: string;
  options: Record<string, string>;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue ?? Object.keys(options)[0]}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
      >
        {Object.entries(options).map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}
