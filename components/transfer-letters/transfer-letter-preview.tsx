"use client";

import type { TransferLetterType } from "@/lib/generated/prisma/client";
import { amountHasValue, formatAmountLine } from "@/lib/transfer/amount-in-words";
import { formatTransferLetterDate } from "@/lib/transfer/format-letter-date";
import { formatTransferLetterSerialNumber } from "@/lib/transfer/format-serial-number";
import type { TransferLetterFormData } from "@/lib/transfer/types";

type TransferLetterPreviewProps = {
  data: TransferLetterFormData;
  serialNumber?: number | null;
};

type TransferFieldRow = {
  label: string;
  value?: string | null;
};

function TransferFieldTable({ rows }: { rows: TransferFieldRow[] }) {
  return (
    <table className="mb-4 w-full border-collapse border border-black text-[15px] leading-normal print:text-[14pt]">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="w-[30%] border border-black px-2 py-2 align-top">{row.label}</td>
            <td className="min-h-[1.75rem] border border-black px-2 py-2 align-top whitespace-pre-wrap">
              {row.value?.trim() ?? ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildTransferFieldRows(
  type: TransferLetterType,
  data: TransferLetterFormData,
  amountLine: string | null,
): TransferFieldRow[] {
  const amountRow = { label: "Amount", value: amountLine };

  if (type === "LOCAL") {
    return [
      amountRow,
      { label: "Bank", value: data.beneficiaryBankName },
      { label: "For credit of", value: data.beneficiaryName },
      { label: "Account NO", value: data.beneficiaryAccountNumber },
      { label: "IBAN", value: data.beneficiaryIban },
      { label: "Purpose", value: data.purpose },
      { label: "Mobile No", value: data.mobileNo },
      { label: "Email", value: data.email },
    ];
  }

  if (type === "INTERNATIONAL") {
    return [
      amountRow,
      { label: "Bank", value: data.beneficiaryBankName },
      { label: "For credit of", value: data.beneficiaryName },
      { label: "IBAN", value: data.beneficiaryIban },
      { label: "Account NO", value: data.beneficiaryAccountNumber },
      { label: "Purpose", value: data.purpose },
      { label: "Mobile No", value: data.mobileNo },
      { label: "Email", value: data.email },
    ];
  }

  return [
    amountRow,
    { label: "Bank", value: data.beneficiaryBankName },
    { label: "For credit of", value: data.beneficiaryName },
    { label: "IBAN", value: data.beneficiaryIban },
    { label: "Sort Code", value: data.beneficiarySortCode },
    { label: "Swift/BIC", value: data.beneficiarySwiftCode },
    { label: "Account NO", value: data.beneficiaryAccountNumber },
    { label: "Purpose", value: data.purpose },
    { label: "Mobile No", value: data.mobileNo },
    { label: "Email", value: data.email },
  ];
}

export function TransferLetterPreview({ data, serialNumber }: TransferLetterPreviewProps) {
  const type = data.type as TransferLetterType;
  const letterDate = data.letterDate ? formatTransferLetterDate(data.letterDate, type) : "";
  const debitAccountNumber = data.sourceAccountNumber.trim() || "********************";
  const hasAmount = amountHasValue(data.amount, data.currency);
  const amountLine = hasAmount ? formatAmountLine(data.amount, data.currency, type) : null;
  const fieldRows = buildTransferFieldRows(type, data, amountLine);

  return (
    <article
      id="transfer-letter-preview"
      className="mx-auto max-w-2xl text-[15px] leading-normal text-foreground print:max-w-none print:text-[14pt]"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        {letterDate ? <p>{letterDate}</p> : <span />}
        {serialNumber != null ? (
          <p className="shrink-0 text-right">Ref: {formatTransferLetterSerialNumber(serialNumber)}</p>
        ) : null}
      </div>

      <div className="mb-4">
        <p>The Manager</p>
        {data.sourceBankName ? <p>{data.sourceBankName}</p> : null}
        {data.sourceBranch ? <p>{data.sourceBranch}</p> : null}
      </div>

      <p className="mb-4">Dear Sir,</p>
      <p className="mb-4">Please make the following wire transfer:</p>

      <TransferFieldTable rows={fieldRows} />

      <p className="mb-4">
        You may debit the above amount to our Account No. {debitAccountNumber} with you, under advice to us.
      </p>

      {data.notes?.trim() ? <p className="mb-4 whitespace-pre-wrap">{data.notes}</p> : null}

      {type === "INTERNATIONAL" ? (
        <div className="mb-4">
          <p>Special Instruction/Memo:</p>
          {data.specialInstructions?.trim() ? (
            <p className="mt-1 whitespace-pre-wrap">{data.specialInstructions}</p>
          ) : null}
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
