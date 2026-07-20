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

const BLOCK_SPACING = "mb-2 print:mb-1";
const ARTICLE_CLASS =
  "mx-auto max-w-2xl text-[14px] leading-snug text-foreground print:max-w-none print:text-[11pt] print:leading-tight";

function TransferFieldTable({ rows }: { rows: TransferFieldRow[] }) {
  return (
    <table className="mb-2 w-full border-collapse border border-black text-[14px] leading-snug print:mb-1 print:text-[10.5pt] print:leading-tight">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <td className="w-[32%] border border-black px-2 py-1.5 align-top print:px-1.5 print:py-0.5">
              {row.label}
            </td>
            <td className="min-h-[1.25rem] border border-black px-2 py-1.5 align-top whitespace-pre-wrap print:px-1.5 print:py-0.5">
              {row.value?.trim() ?? ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function hasCorrespondentBankDetails(data: TransferLetterFormData) {
  return Boolean(
    data.correspondentBankName?.trim() ||
      data.correspondentSwiftCode?.trim() ||
      data.correspondentRoutingNumber?.trim() ||
      data.correspondentFfcInstructions?.trim(),
  );
}

function buildTransferFieldRows(
  type: TransferLetterType,
  data: TransferLetterFormData,
  amountLine: string | null,
): TransferFieldRow[] {
  const amountRow = { label: "Amount", value: amountLine };
  const contactRows = [
    { label: "Purpose", value: data.purpose },
    { label: "Mobile No", value: data.mobileNo },
    { label: "Email", value: data.email },
  ];

  if (type === "LOCAL") {
    return [
      amountRow,
      { label: "Bank", value: data.beneficiaryBankName },
      { label: "For credit of", value: data.beneficiaryName },
      { label: "Account NO", value: data.beneficiaryAccountNumber },
      { label: "IBAN", value: data.beneficiaryIban },
      ...contactRows,
    ];
  }

  if (type === "INTERNATIONAL") {
    const rows: TransferFieldRow[] = [
      amountRow,
      { label: "Bank", value: data.beneficiaryBankName },
      { label: "For credit of", value: data.beneficiaryName },
      { label: "IBAN", value: data.beneficiaryIban },
      { label: "Account NO", value: data.beneficiaryAccountNumber },
      ...contactRows,
    ];

    if (data.specialInstructions?.trim()) {
      rows.push({ label: "Special Instruction/Memo", value: data.specialInstructions });
    }

    return rows;
  }

  if (type === "USA") {
    const rows: TransferFieldRow[] = [
      amountRow,
      { label: "Bank", value: data.beneficiaryBankName },
      { label: "For credit of", value: data.beneficiaryName },
      { label: "Routing Number (ABA)", value: data.beneficiaryRoutingNumber },
      { label: "Swift/BIC", value: data.beneficiarySwiftCode },
      { label: "Account NO", value: data.beneficiaryAccountNumber },
      ...contactRows,
    ];

    if (hasCorrespondentBankDetails(data)) {
      rows.push(
        { label: "Correspondent Bank", value: data.correspondentBankName },
        { label: "Correspondent SWIFT / BIC", value: data.correspondentSwiftCode },
        { label: "Correspondent Routing (ABA)", value: data.correspondentRoutingNumber },
        { label: "FFC Instructions", value: data.correspondentFfcInstructions },
      );
    }

    return rows;
  }

  return [
    amountRow,
    { label: "Bank", value: data.beneficiaryBankName },
    { label: "For credit of", value: data.beneficiaryName },
    { label: "IBAN", value: data.beneficiaryIban },
    { label: "Sort Code", value: data.beneficiarySortCode },
    { label: "Swift/BIC", value: data.beneficiarySwiftCode },
    { label: "Account NO", value: data.beneficiaryAccountNumber },
    ...contactRows,
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
    <article id="transfer-letter-preview" data-letter-type={type} className={ARTICLE_CLASS}>
      <div className={`flex items-start justify-between gap-4 ${BLOCK_SPACING}`}>
        {letterDate ? <p>{letterDate}</p> : <span />}
        {serialNumber != null ? (
          <p className="shrink-0 text-right">
            S.No. {formatTransferLetterSerialNumber(serialNumber)}
          </p>
        ) : null}
      </div>

      <div className={BLOCK_SPACING}>
        <p>The Manager</p>
        {data.sourceBankName ? <p>{data.sourceBankName}</p> : null}
        {data.sourceBranch ? <p>{data.sourceBranch}</p> : null}
      </div>

      <p className={BLOCK_SPACING}>Dear Sir,</p>
      <p className={BLOCK_SPACING}>Please make the following wire transfer:</p>

      <TransferFieldTable rows={fieldRows} />

      <p className={BLOCK_SPACING}>
        You may debit the above amount to our Account No. {debitAccountNumber} with you, under advice to us.
      </p>

      {data.notes?.trim() ? (
        <p className={`whitespace-pre-wrap ${BLOCK_SPACING}`}>{data.notes}</p>
      ) : null}

      {type === "UK" && data.chargesOnBeneficiary ? (
        <p className={BLOCK_SPACING}>All Charges to be Deducted from Beneficiary account.</p>
      ) : null}

      <div className="pt-1 print:pt-0">
        <p>Yours faithfully,</p>
        <p className="pt-6 print:pt-4">Authorized Signatory</p>
      </div>
    </article>
  );
}
