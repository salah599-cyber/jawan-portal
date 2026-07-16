"use client";

import type { TransferLetterType } from "@/lib/generated/prisma/client";
import { formatAmountLine, maskAccountNumber } from "@/lib/transfer/amount-in-words";
import { formatTransferLetterDate } from "@/lib/transfer/format-letter-date";
import type { TransferLetterFormData } from "@/lib/transfer/types";

type TransferLetterPreviewProps = {
  data: TransferLetterFormData;
  showFullSourceAccount?: boolean;
};

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <p>
      <span className="font-medium">{label}</span>
      {label.endsWith(" ") ? null : " "}
      {value}
    </p>
  );
}

export function TransferLetterPreview({ data, showFullSourceAccount = false }: TransferLetterPreviewProps) {
  const amount = Number.parseFloat(data.amount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const type = data.type as TransferLetterType;
  const letterDate = data.letterDate ? formatTransferLetterDate(data.letterDate, type) : "";
  const sourceLine = showFullSourceAccount ? data.sourceAccountNumber : maskAccountNumber(data.sourceAccountNumber);
  const sourceBankHeader = [data.sourceBankName, data.sourceBranch].filter(Boolean).join("\n");

  return (
    <article
      id="transfer-letter-preview"
      className="mx-auto max-w-2xl space-y-4 whitespace-pre-wrap font-serif text-[15px] leading-relaxed text-foreground print:max-w-none print:text-[14pt]"
    >
      {letterDate ? <p>{letterDate}</p> : null}

      <div>
        <p>The Manager</p>
        {sourceBankHeader ? <p>{sourceBankHeader}</p> : null}
      </div>

      <p>Dear Sir,</p>
      <p>Please make the following wire transfer:</p>

      <div className="space-y-1">
        <p className="font-medium">Amount</p>
        {hasAmount ? (
          <p>{formatAmountLine(amount, data.currency, type)}</p>
        ) : (
          <p className="text-muted-foreground italic">Enter an amount to preview</p>
        )}
      </div>

      <Field label="Bank" value={data.beneficiaryBankName} />
      <Field label="For credit of" value={data.beneficiaryName} />

      {type === "UK" ? (
        <>
          <Field label="IBAN" value={data.beneficiaryIban} />
          <Field label="Sort Code" value={data.beneficiarySortCode} />
          <Field label="Swift/BIC" value={data.beneficiarySwiftCode} />
          <Field label="Account NO" value={data.beneficiaryAccountNumber} />
        </>
      ) : type === "INTERNATIONAL" ? (
        <>
          <Field label="IBAN" value={data.beneficiaryIban} />
          <Field label="Account NO" value={data.beneficiaryAccountNumber} />
        </>
      ) : (
        <>
          <Field label="Account NO" value={data.beneficiaryAccountNumber} />
          <Field label="IBAN" value={data.beneficiaryIban} />
        </>
      )}

      <Field label="Purpose" value={data.purpose} />
      <Field label="Mobile No" value={data.mobileNo} />
      <Field label="Email" value={data.email} />

      <p>
        You may debit the above amount to our Account No. {sourceLine} with you, under advice to us.
      </p>

      {type === "INTERNATIONAL" && data.specialInstructions?.trim() ? (
        <div>
          <p className="font-medium">Special Instruction/Memo:</p>
          <p>{data.specialInstructions}</p>
        </div>
      ) : null}

      {type === "UK" && data.chargesOnBeneficiary ? (
        <p>All Charges to be Deducted from Beneficiary account.</p>
      ) : null}

      <div className="pt-6">
        <p>Yours faithfully,</p>
        <p className="pt-8">Authorized Signatory</p>
      </div>
    </article>
  );
}
