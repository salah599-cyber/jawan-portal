"use client";

import type { TransferLetterType } from "@/lib/generated/prisma/client";
import { amountHasValue, formatAmountLine, maskAccountNumber } from "@/lib/transfer/amount-in-words";
import { formatTransferLetterDate } from "@/lib/transfer/format-letter-date";
import type { TransferLetterFormData } from "@/lib/transfer/types";

type TransferLetterPreviewProps = {
  data: TransferLetterFormData;
  showFullSourceAccount?: boolean;
};

function StackedField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p>{label}</p>
      {value?.trim() ? <p>{value}</p> : null}
    </div>
  );
}

function InlineField({ label, value }: { label: string; value?: string | null }) {
  if (value?.trim()) {
    return <p>{label} {value}</p>;
  }
  return <p>{label}</p>;
}

export function TransferLetterPreview({ data, showFullSourceAccount = false }: TransferLetterPreviewProps) {
  const type = data.type as TransferLetterType;
  const letterDate = data.letterDate ? formatTransferLetterDate(data.letterDate, type) : "";
  const sourceLine = showFullSourceAccount ? data.sourceAccountNumber : maskAccountNumber(data.sourceAccountNumber);
  const hasAmount = amountHasValue(data.amount, data.currency);
  const amountLine = hasAmount ? formatAmountLine(data.amount, data.currency, type) : null;

  return (
    <article
      id="transfer-letter-preview"
      className="mx-auto max-w-2xl font-serif text-[15px] leading-snug text-foreground print:max-w-none print:text-[14pt]"
    >
      {letterDate ? <p className="mb-4">{letterDate}</p> : null}

      <div className="mb-4">
        <p>The Manager</p>
        {data.sourceBankName ? <p>{data.sourceBankName}</p> : null}
        {data.sourceBranch ? <p>{data.sourceBranch}</p> : null}
      </div>

      <p className="mb-4">Dear Sir,</p>
      <p className="mb-4">Please make the following wire transfer:</p>

      <div className="mb-4 space-y-0">
        {type === "LOCAL" ? (
          <>
            <p>Amount</p>
            {amountLine ? <p>{amountLine}</p> : null}
            <StackedField label="Bank" value={data.beneficiaryBankName} />
            <StackedField label="For credit of" value={data.beneficiaryName} />
            <StackedField label="Account NO" value={data.beneficiaryAccountNumber} />
            <StackedField label="IBAN" value={data.beneficiaryIban} />
            <StackedField label="Purpose" value={data.purpose} />
            <StackedField label="Mobile No" value={data.mobileNo} />
            <StackedField label="Email" value={data.email} />
          </>
        ) : type === "INTERNATIONAL" ? (
          <>
            <p>{amountLine ? `Amount ${amountLine}` : "Amount"}</p>
            <StackedField label="Bank" value={data.beneficiaryBankName} />
            <StackedField label="For credit of" value={data.beneficiaryName} />
            <StackedField label="IBAN" value={data.beneficiaryIban} />
            <StackedField label="Account NO" value={data.beneficiaryAccountNumber} />
            <StackedField label="Purpose" value={data.purpose} />
            <StackedField label="Mobile No" value={data.mobileNo} />
            <StackedField label="Email" value={data.email} />
          </>
        ) : (
          <>
            <p>{amountLine ? `Amount ${amountLine}` : "Amount"}</p>
            <StackedField label="Bank" value={data.beneficiaryBankName} />
            <StackedField label="For credit of" value={data.beneficiaryName} />
            <StackedField label="IBAN" value={data.beneficiaryIban} />
            <StackedField label="Sort Code" value={data.beneficiarySortCode} />
            <StackedField label="Swift/BIC" value={data.beneficiarySwiftCode} />
            <StackedField label="Account NO" value={data.beneficiaryAccountNumber} />
            <StackedField label="Purpose" value={data.purpose} />
            <InlineField label="Mobile No" value={data.mobileNo} />
            <InlineField label="Email" value={data.email} />
          </>
        )}
      </div>

      <p className="mb-4">
        You may debit the above amount to our Account No. {sourceLine} with you, under advice to us.
      </p>

      {type === "INTERNATIONAL" ? (
        <div className="mb-4">
          <p>Special Instruction/Memo:</p>
          {data.specialInstructions?.trim() ? <p>{data.specialInstructions}</p> : null}
        </div>
      ) : null}

      {type === "UK" && data.chargesOnBeneficiary ? (
        <p className="mb-4">All Charges to be Deducted from Beneficiary account.</p>
      ) : null}

      <div className="pt-2">
        <p>Yours faithfully,</p>
        <p className="pt-10">Authorized Signatory</p>
      </div>
    </article>
  );
}
