"use client";

import type { TransferLetterType } from "@/lib/generated/prisma/client";
import { formatAmountLine, maskAccountNumber } from "@/lib/transfer/amount-in-words";
import { formatTransferLetterDate } from "@/lib/transfer/format-letter-date";
import type { TransferLetterFormData } from "@/lib/transfer/types";

type TransferLetterPreviewProps = {
  data: TransferLetterFormData;
  showFullSourceAccount?: boolean;
};

type DetailRow = {
  label: string;
  value?: string | null;
};

function TransferDetailsTable({ rows }: { rows: DetailRow[] }) {
  const visibleRows = rows.filter((row) => row.value?.trim());
  if (visibleRows.length === 0) return null;

  return (
    <table className="my-4 w-full border-collapse text-[15px] print:text-[14pt]">
      <tbody>
        {visibleRows.map((row) => (
          <tr key={row.label} className="border-b border-border/60 last:border-b-0">
            <th
              scope="row"
              className="w-[38%] py-2 pr-4 text-left align-top font-medium whitespace-nowrap"
            >
              {row.label}:
            </th>
            <td className="py-2 align-top">{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TransferLetterPreview({ data, showFullSourceAccount = false }: TransferLetterPreviewProps) {
  const amount = Number.parseFloat(data.amount);
  const hasAmount = Number.isFinite(amount) && amount > 0;
  const type = data.type as TransferLetterType;
  const letterDate = data.letterDate ? formatTransferLetterDate(data.letterDate, type) : "";
  const sourceLine = showFullSourceAccount ? data.sourceAccountNumber : maskAccountNumber(data.sourceAccountNumber);
  const sourceBankHeader = [data.sourceBankName, data.sourceBranch].filter(Boolean).join("\n");

  const accountRows: DetailRow[] =
    type === "UK"
      ? [
          { label: "IBAN", value: data.beneficiaryIban },
          { label: "Sort Code", value: data.beneficiarySortCode },
          { label: "Swift/BIC", value: data.beneficiarySwiftCode },
          { label: "Account NO", value: data.beneficiaryAccountNumber },
        ]
      : type === "INTERNATIONAL"
        ? [
            { label: "IBAN", value: data.beneficiaryIban },
            { label: "Account NO", value: data.beneficiaryAccountNumber },
          ]
        : [
            { label: "Account NO", value: data.beneficiaryAccountNumber },
            { label: "IBAN", value: data.beneficiaryIban },
          ];

  const detailRows: DetailRow[] = [
    {
      label: "Amount",
      value: hasAmount ? formatAmountLine(amount, data.currency, type) : undefined,
    },
    { label: "Bank", value: data.beneficiaryBankName },
    { label: "For credit of", value: data.beneficiaryName },
    ...accountRows,
    { label: "Purpose", value: data.purpose },
    { label: "Mobile No", value: data.mobileNo },
    { label: "Email", value: data.email },
  ];

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

      {!hasAmount && detailRows.filter((row) => row.label !== "Amount").every((row) => !row.value?.trim()) ? (
        <p className="text-muted-foreground italic">Enter transfer details to preview the letter.</p>
      ) : (
        <TransferDetailsTable rows={detailRows} />
      )}

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
