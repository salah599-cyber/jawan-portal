import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { TransferLetterPreview } from "@/components/transfer-letters/transfer-letter-preview";
import { PrintTransferLetterButton } from "@/components/transfer-letters/print-transfer-letter-button";
import { TransferLetterCompleteToggle } from "@/components/transfer-letters/transfer-letter-complete-toggle";
import { deleteTransferLetter, getTransferLetter } from "@/lib/actions/transfer-letters";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { TRANSFER_LETTER_STATUS_LABELS, TRANSFER_LETTER_TYPE_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { formatTransferLetterSerialNumber } from "@/lib/transfer/format-serial-number";
import { transferLetterToFormData } from "@/lib/transfer/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TransferLetterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("ASSETS");
  const letter = await getTransferLetter(id);
  if (!letter) notFound();

  const showActions = canWrite(ctx, "ASSETS");
  const formData = transferLetterToFormData(letter);

  return (
    <>
      <PlatformHeader title={"Transfer Letter " + formatTransferLetterSerialNumber(letter.serialNumber)} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link href="/transfer-letters">Back to Transfer Letters</Link>
          </Button>
          {showActions ? (
            <>
              <EditLinkButton href={"/transfer-letters/" + letter.id + "/edit"} />
              <DeleteEntryButton
                itemId={letter.id}
                itemLabel={letter.beneficiaryName}
                deleteAction={deleteTransferLetter}
                redirectTo="/transfer-letters"
                title="Delete transfer letter?"
                description="This will permanently remove this transfer letter from the register."
              />
            </>
          ) : null}
          <PrintTransferLetterButton />
        </div>

        <Card className="print:hidden">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {letter.beneficiaryName}
              <Badge variant="outline">
                {TRANSFER_LETTER_TYPE_LABELS[letter.type] ?? letter.type}
              </Badge>
              <Badge variant={letter.status === "COMPLETE" ? "default" : "secondary"}>
                {TRANSFER_LETTER_STATUS_LABELS[letter.status] ?? letter.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {formatTransferLetterSerialNumber(letter.serialNumber)} · {formatDate(letter.letterDate)} · {letter.entity.name} · {formatMoney(letter.amount, letter.currency)}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <TransferLetterCompleteToggle
                letterId={letter.id}
                status={letter.status}
                canEdit={showActions}
              />
              <div>
                <p className="text-sm font-medium">
                  {letter.status === "COMPLETE" ? "Transfer completed" : "Mark transfer as complete"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {letter.status === "COMPLETE"
                    ? "This transfer has been marked complete. Click the tick to mark it pending again."
                    : "Click the circle when the bank transfer has been executed."}
                </p>
              </div>
            </div>
            <Detail label="Reference" value={formatTransferLetterSerialNumber(letter.serialNumber)} />
            <Detail label="Source Bank" value={letter.sourceBankName} />
            <Detail label="Branch" value={letter.sourceBranch} />
            <Detail label="Debit Account" value={letter.sourceAccountNumber} />
            <Detail label="Beneficiary Bank" value={letter.beneficiaryBankName} />
            <Detail label="Amount in Words" value={letter.amountInWords} />
            <Detail label="Purpose" value={letter.purpose} />
            <Detail label="Notes" value={letter.notes} />
            <Detail label="Mobile" value={letter.mobileNo} />
            <Detail label="Email" value={letter.email} />
            {letter.createdBy ? (
              <Detail
                label="Created By"
                value={[letter.createdBy.firstName, letter.createdBy.lastName].filter(Boolean).join(" ") || letter.createdBy.email}
              />
            ) : null}
            <Detail label="Recorded" value={formatDate(letter.createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="print:hidden">
            <CardTitle>Letter</CardTitle>
            <CardDescription>Print-ready transfer letter</CardDescription>
          </CardHeader>
          <CardContent className="rounded-md border bg-white p-6 shadow-sm print:border-0 print:p-0 print:shadow-none">
            <TransferLetterPreview data={formData} serialNumber={letter.serialNumber} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm">{value?.trim() ? value : "—"}</p>
    </div>
  );
}
