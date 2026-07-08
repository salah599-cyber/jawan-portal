import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { UploadChequeDocumentsForm } from "@/components/cheques/upload-cheque-documents-form";
import { getCheque, deleteCheque, deleteChequeDocument } from "@/lib/actions/cheques";
import { fileHref } from "@/lib/files/href";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import {
  CHEQUE_DIRECTION_LABELS,
  CHEQUE_DOCUMENT_TYPE_LABELS,
  CHEQUE_STATUS_LABELS,
} from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ChequeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("CHEQUES");
  const cheque = await getCheque(id);
  if (!cheque) notFound();

  const showWrite = canWrite(ctx, "CHEQUES");
  const docsByType = {
    CHEQUE_COPY: cheque.documents.filter((d) => d.documentType === "CHEQUE_COPY"),
    DEPOSIT_SLIP: cheque.documents.filter((d) => d.documentType === "DEPOSIT_SLIP"),
    BANK_CONFIRMATION: cheque.documents.filter((d) => d.documentType === "BANK_CONFIRMATION"),
    OTHER: cheque.documents.filter((d) => d.documentType === "OTHER"),
  };

  const bankDisplay = cheque.bankAccount
    ? cheque.bankAccount.bankName + " · " + cheque.bankAccount.accountName + " (" + cheque.bankAccount.accountNumber + ")"
    : cheque.bankName;

  return (
    <>
      <PlatformHeader title={"Cheque #" + cheque.chequeNumber} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/cheques">Back to Cheques</Link>
          </Button>
          {showWrite ? (
            <>
              <EditLinkButton href={"/cheques/" + cheque.id + "/edit"} />
              <DeleteEntryButton
                itemId={cheque.id}
                itemLabel={"Cheque #" + cheque.chequeNumber}
                deleteAction={deleteCheque}
                redirectTo="/cheques"
                title="Remove cheque?"
                description="This will remove the cheque from the register. Documents are kept but the record will no longer appear in lists."
              />
            </>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Cheque Details</CardTitle>
              <CardDescription>
                {CHEQUE_DIRECTION_LABELS[cheque.direction] ?? cheque.direction}
                {cheque.purpose ? " · " + cheque.purpose : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Status" value={<Badge variant="secondary">{CHEQUE_STATUS_LABELS[cheque.status] ?? cheque.status}</Badge>} />
              <Detail label="Entity" value={cheque.entity.name} />
              <Detail label="Cheque Number" value={cheque.chequeNumber} />
              <Detail label={cheque.direction === "ISSUED" ? "Payee" : "Payer"} value={cheque.payee} />
              <Detail label="Amount" value={formatMoney(cheque.amount, cheque.currency)} />
              <Detail label="Bank" value={bankDisplay} />
              <Detail label="Issue Date" value={formatDate(cheque.issueDate)} />
              <Detail label="Due Date" value={formatDate(cheque.dueDate)} />
              <Detail label="Clearance Date" value={formatDate(cheque.clearanceDate)} />
              {cheque.notes ? (
                <div className="sm:col-span-2">
                  <Detail label="Notes" value={cheque.notes} />
                </div>
              ) : null}
            </CardContent>
          </Card>
          {showWrite ? <UploadChequeDocumentsForm chequeId={cheque.id} /> : null}
        </div>

        {(["CHEQUE_COPY", "DEPOSIT_SLIP", "BANK_CONFIRMATION", "OTHER"] as const).map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{CHEQUE_DOCUMENT_TYPE_LABELS[type]}</CardTitle>
              <CardDescription>
                {docsByType[type].length} document{docsByType[type].length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {docsByType[type].length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <ul className="space-y-2">
                  {docsByType[type].map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-4 text-sm">
                      <div>
                        <p className="font-medium">{doc.label ?? doc.fileName}</p>
                        <p className="text-muted-foreground">
                          {doc.fileName} - {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a href={fileHref("cheque", doc.id)} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      </Button>
                      {showWrite ? (
                        <DeleteEntryButton
                          itemId={doc.id}
                          itemLabel={doc.label ?? doc.fileName}
                          deleteAction={deleteChequeDocument}
                          title="Delete document?"
                        />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </main>
    </>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode | string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value ?? "-"}</div>
    </div>
  );
}
