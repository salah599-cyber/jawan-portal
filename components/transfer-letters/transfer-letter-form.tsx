"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTransferLetter,
  updateTransferLetter,
} from "@/lib/actions/transfer-letters";
import { TRANSFER_LETTER_TYPE_LABELS } from "@/lib/labels";
import {
  amountHasValue,
  formatAmountLine,
  getMaxDecimalPlaces,
} from "@/lib/transfer/amount-in-words";
import { TransferLetterPreview } from "@/components/transfer-letters/transfer-letter-preview";
import { PrintTransferLetterButton } from "@/components/transfer-letters/print-transfer-letter-button";
import { CurrencySelect } from "@/components/transfer-letters/currency-select";
import { BankDivisionSelect } from "@/components/transfer-letters/bank-division-select";
import {
  bankAccountPickToBeneficiaryFields,
  bankAccountPickToSourceFields,
  findBankAccountPickOption,
  flattenBankAccountPickOptions,
  formatBankAccountPickLabel,
} from "@/lib/transfer/bank-account-fields";
import {
  emptyTransferLetterForm,
  type TransferLetterBankOption,
  type TransferLetterFormData,
} from "@/lib/transfer/types";
import type { TransferLetterType } from "@/lib/generated/prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EntitySelect, type EntityOption } from "@/components/platform/entity-select";

type TransferLetterFormProps = {
  entities: EntityOption[];
  bankAccounts: TransferLetterBankOption[];
  initialData?: TransferLetterFormData;
  letterId?: string;
  serialNumber?: number | null;
  preselectedBankAccountId?: string;
};

function buildInitialForm(
  bankAccounts: TransferLetterBankOption[],
  entities: EntityOption[],
  initialData?: TransferLetterFormData,
  preselectedBankAccountId?: string,
): TransferLetterFormData {
  const accountPickOptions = flattenBankAccountPickOptions(bankAccounts);
  const base = initialData ?? emptyTransferLetterForm({
    entityId: entities[0]?.id ?? "",
  });

  if (initialData) {
    const sourcePick = findBankAccountPickOption(accountPickOptions, {
      bankAccountId: initialData.sourceBankAccountId,
      accountNumber: initialData.sourceAccountNumber,
    });
    const beneficiaryPick = findBankAccountPickOption(accountPickOptions, {
      bankAccountId: initialData.beneficiaryBankAccountId,
      accountNumber: initialData.beneficiaryAccountNumber,
    });

    return {
      ...initialData,
      sourcePickId: sourcePick?.pickId ?? "",
      beneficiaryPickId: beneficiaryPick?.pickId ?? "",
    };
  }

  if (!preselectedBankAccountId) return base;

  const sourcePick = findBankAccountPickOption(accountPickOptions, {
    bankAccountId: preselectedBankAccountId,
  });
  if (!sourcePick || sourcePick.includeInTransferLetterSource === false) return base;

  return {
    ...base,
    sourceMode: "bank",
    sourceBankAccountId: sourcePick.bankAccountId,
    sourcePickId: sourcePick.pickId,
    ...bankAccountPickToSourceFields(sourcePick),
    entityId: sourcePick.entityId ?? base.entityId,
  };
}

export function TransferLetterForm({
  entities,
  bankAccounts,
  initialData,
  letterId,
  serialNumber,
  preselectedBankAccountId,
}: TransferLetterFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<TransferLetterFormData>(() =>
    buildInitialForm(bankAccounts, entities, initialData, preselectedBankAccountId),
  );

  const accountPickOptions = useMemo(
    () => flattenBankAccountPickOptions(bankAccounts),
    [bankAccounts],
  );

  const sourceAccountPickOptions = useMemo(() => {
    const entityFiltered = accountPickOptions.filter(
      (option) => !option.entityId || option.entityId === form.entityId,
    );

    const eligible = entityFiltered.filter(
      (option) => option.includeInTransferLetterSource !== false,
    );

    if (!form.sourcePickId) return eligible;

    const selected = accountPickOptions.find((option) => option.pickId === form.sourcePickId);
    if (selected && !eligible.some((option) => option.pickId === selected.pickId)) {
      return [selected, ...eligible];
    }

    return eligible;
  }, [accountPickOptions, form.entityId, form.sourcePickId]);

  const sourceSelectValue = useMemo(() => {
    if (form.sourceMode === "manual") return "manual";
    if (
      form.sourcePickId &&
      sourceAccountPickOptions.some((option) => option.pickId === form.sourcePickId)
    ) {
      return form.sourcePickId;
    }
    return "manual";
  }, [form.sourceMode, form.sourcePickId, sourceAccountPickOptions]);

  function handleEntityChange(entityId: string) {
    setForm((current) => {
      const next = { ...current, entityId };
      if (current.sourceMode !== "bank" || !current.sourcePickId) return next;

      const stillValid = accountPickOptions.some(
        (option) =>
          option.pickId === current.sourcePickId &&
          (!option.entityId || option.entityId === entityId) &&
          option.includeInTransferLetterSource !== false,
      );

      if (stillValid) return next;

      return {
        ...next,
        sourceMode: "manual",
        sourcePickId: "",
        sourceBankAccountId: "",
      };
    });
  }

  function updateField<K extends keyof TransferLetterFormData>(key: K, value: TransferLetterFormData[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleTypeChange(type: TransferLetterType) {
    setForm((current) => ({
      ...current,
      type,
      chargesOnBeneficiary: type === "UK",
    }));
  }

  function handleSourcePickChange(pickId: string) {
    if (pickId === "manual") {
      setForm((current) => ({
        ...current,
        sourceMode: "manual",
        sourceBankAccountId: "",
        sourcePickId: "",
      }));
      return;
    }

    const option = accountPickOptions.find((item) => item.pickId === pickId);
    if (!option) return;

    const sourceFields = bankAccountPickToSourceFields(option);
    setForm((current) => ({
      ...current,
      sourceMode: "bank",
      sourceBankAccountId: option.bankAccountId,
      sourcePickId: option.pickId,
      ...sourceFields,
      currency: sourceFields.currency || current.currency,
    }));
  }

  function handleBeneficiaryPickChange(pickId: string) {
    if (pickId === "manual") {
      setForm((current) => ({
        ...current,
        beneficiaryMode: "manual",
        beneficiaryBankAccountId: "",
        beneficiaryPickId: "",
      }));
      return;
    }

    const option = accountPickOptions.find((item) => item.pickId === pickId);
    if (!option) return;

    setForm((current) => ({
      ...current,
      beneficiaryMode: "bank",
      beneficiaryBankAccountId: option.bankAccountId,
      beneficiaryPickId: option.pickId,
      ...bankAccountPickToBeneficiaryFields(option),
    }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type", form.type);
    formData.set("entityId", form.entityId);
    formData.set("sourceMode", form.sourceMode);
    formData.set("sourceBankAccountId", form.sourceBankAccountId);
    formData.set("beneficiaryMode", form.beneficiaryMode);
    formData.set("beneficiaryBankAccountId", form.beneficiaryBankAccountId);
    formData.set("currency", form.currency);
    if (form.chargesOnBeneficiary) {
      formData.set("chargesOnBeneficiary", "true");
    }

    startTransition(async () => {
      try {
        const letter = letterId
          ? await updateTransferLetter(letterId, formData)
          : await createTransferLetter(formData);
        router.push("/transfer-letters/" + letter.id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save transfer letter.");
      }
    });
  }

  const amountPreview = amountHasValue(form.amount, form.currency)
    ? formatAmountLine(form.amount, form.currency, form.type)
    : null;
  const amountStep = getMaxDecimalPlaces(form.currency) === 3 ? "0.001" : "0.01";

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>{letterId ? "Edit Transfer Letter" : "New Transfer Letter"}</CardTitle>
          <CardDescription>
            Fill in transfer details. Amount in words updates automatically as you type.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Template</Label>
              <Select value={form.type} onValueChange={(value) => handleTypeChange(value as TransferLetterType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRANSFER_LETTER_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={form.type} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="letterDate">Letter Date</Label>
              <Input
                id="letterDate"
                name="letterDate"
                type="date"
                required
                value={form.letterDate}
                onChange={(e) => updateField("letterDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Entity</Label>
              <EntitySelect
                entities={entities}
                value={form.entityId}
                onValueChange={handleEntityChange}
              />
              <input type="hidden" name="entityId" value={form.entityId} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Source Account (debit from)</Label>
              <Select
                value={sourceSelectValue}
                onValueChange={handleSourcePickChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Enter manually</SelectItem>
                  {sourceAccountPickOptions.map((option) => (
                    <SelectItem key={option.pickId} value={option.pickId}>
                      {formatBankAccountPickLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceAccountPickOptions.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No source accounts are available for this entity. Edit a bank account and enable
                  &quot;Include in transfer letter source accounts&quot; on specific account numbers,
                  or enter source details manually.
                </p>
              ) : null}
              <input type="hidden" name="sourceMode" value={form.sourceMode} />
              <input type="hidden" name="sourceBankAccountId" value={form.sourceBankAccountId} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceBankName">Source Bank Name</Label>
              <Input
                id="sourceBankName"
                name="sourceBankName"
                required
                value={form.sourceBankName}
                onChange={(e) => updateField("sourceBankName", e.target.value)}
              />
            </div>

            <BankDivisionSelect
              value={form.sourceBranch}
              onValueChange={(value) => updateField("sourceBranch", value)}
            />

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="sourceAccountNumber">Our Account Number (debit)</Label>
              <Input
                id="sourceAccountNumber"
                name="sourceAccountNumber"
                required
                value={form.sourceAccountNumber}
                onChange={(e) => updateField("sourceAccountNumber", e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <h3 className="mb-3 text-sm font-medium">Beneficiary (credit to)</h3>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Beneficiary Account</Label>
              <Select
                value={form.beneficiaryMode === "manual" ? "manual" : form.beneficiaryPickId || "manual"}
                onValueChange={handleBeneficiaryPickChange}
              >
                <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Enter manually</SelectItem>
                  {accountPickOptions.map((option) => (
                    <SelectItem key={option.pickId} value={option.pickId}>
                      {formatBankAccountPickLabel(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="beneficiaryMode" value={form.beneficiaryMode} />
              <input type="hidden" name="beneficiaryBankAccountId" value={form.beneficiaryBankAccountId} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiaryBankName">Bank</Label>
              <Input
                id="beneficiaryBankName"
                name="beneficiaryBankName"
                required
                value={form.beneficiaryBankName}
                onChange={(e) => updateField("beneficiaryBankName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiaryName">For credit of</Label>
              <Input
                id="beneficiaryName"
                name="beneficiaryName"
                required
                value={form.beneficiaryName}
                onChange={(e) => updateField("beneficiaryName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiaryAccountNumber">Account No</Label>
              <Input
                id="beneficiaryAccountNumber"
                name="beneficiaryAccountNumber"
                value={form.beneficiaryAccountNumber}
                onChange={(e) => updateField("beneficiaryAccountNumber", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiaryIban">IBAN</Label>
              <Input
                id="beneficiaryIban"
                name="beneficiaryIban"
                value={form.beneficiaryIban}
                onChange={(e) => updateField("beneficiaryIban", e.target.value)}
              />
            </div>

            {form.type === "UK" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="beneficiarySortCode">Sort Code</Label>
                  <Input
                    id="beneficiarySortCode"
                    name="beneficiarySortCode"
                    value={form.beneficiarySortCode}
                    onChange={(e) => updateField("beneficiarySortCode", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="beneficiarySwiftCode">Swift/BIC</Label>
                  <Input
                    id="beneficiarySwiftCode"
                    name="beneficiarySwiftCode"
                    value={form.beneficiarySwiftCode}
                    onChange={(e) => updateField("beneficiarySwiftCode", e.target.value)}
                  />
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0.001"
                step={amountStep}
                required
                value={form.amount}
                onChange={(e) => updateField("amount", e.target.value)}
              />
            </div>

            <CurrencySelect
              value={form.currency}
              onValueChange={(value) => updateField("currency", value)}
            />

            {amountPreview ? (
              <div className="md:col-span-2 rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium text-muted-foreground">Amount in words</p>
                <p>{amountPreview}</p>
              </div>
            ) : null}

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="purpose">Purpose (optional)</Label>
              <Input
                id="purpose"
                name="purpose"
                value={form.purpose}
                onChange={(e) => updateField("purpose", e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                placeholder="Appears below the debit authorization line in the letter"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobileNo">Mobile No</Label>
              <Input
                id="mobileNo"
                name="mobileNo"
                value={form.mobileNo}
                onChange={(e) => updateField("mobileNo", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
              />
            </div>

            {form.type === "INTERNATIONAL" ? (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="specialInstructions">Special Instruction / Memo</Label>
                <Textarea
                  id="specialInstructions"
                  name="specialInstructions"
                  rows={3}
                  value={form.specialInstructions}
                  onChange={(e) => updateField("specialInstructions", e.target.value)}
                />
              </div>
            ) : null}

            {form.type === "UK" ? (
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  id="chargesOnBeneficiary"
                  name="chargesOnBeneficiary"
                  type="checkbox"
                  checked={form.chargesOnBeneficiary}
                  onChange={(e) => updateField("chargesOnBeneficiary", e.target.checked)}
                  className="h-4 w-4 rounded border"
                />
                <Label htmlFor="chargesOnBeneficiary" className="font-normal">
                  All charges to be deducted from beneficiary account
                </Label>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive md:col-span-2">{error}</p> : null}

            <div className="flex flex-wrap gap-2 md:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving..." : letterId ? "Update Letter" : "Save & Record"}
              </Button>
              <PrintTransferLetterButton />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 print:hidden">
          <div>
            <CardTitle>Letter Preview</CardTitle>
            <CardDescription>Live preview matching your bank template</CardDescription>
          </div>
          <PrintTransferLetterButton />
        </CardHeader>
        <CardContent className="rounded-md border bg-white p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
          <TransferLetterPreview data={form} serialNumber={serialNumber} />
        </CardContent>
      </Card>
    </div>
  );
}
