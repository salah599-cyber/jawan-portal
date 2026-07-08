import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { UploadLoanDocumentsForm } from "@/components/loans/upload-loan-documents-form";
import { RecordLoanPaymentForm } from "@/components/loans/record-loan-payment-form";
import { LoanPaymentHistory } from "@/components/loans/loan-payment-history";
import { getLoan, deleteLoan, deleteLoanDocument } from "@/lib/actions/loans";
import { fileHref } from "@/lib/files/href";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import {
  LIABILITY_STATUS_LABELS,
  LIABILITY_TYPE_LABELS,
  LOAN_DOCUMENT_TYPE_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/labels";
import { formatMoney, formatDate, formatDecimalInput } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("LOANS");
  const loan = await getLoan(id);
  if (!loan) notFound();

  const showUpload = canWrite(ctx, "LOANS");
  const balance = loan.outstandingBalance ?? loan.amount;
  const docsByType = {
    LOAN_AGREEMENT: loan.documents.filter((d) => d.documentType === "LOAN_AGREEMENT"),
    PAYMENT_SCHEDULE: loan.documents.filter((d) => d.documentType === "PAYMENT_SCHEDULE"),
    STATEMENT: loan.documents.filter((d) => d.documentType === "STATEMENT"),
    OTHER: loan.documents.filter((d) => d.documentType === "OTHER"),
  };

  return (
    <>
      <PlatformHeader title={loan.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/loans">Back to Loans</Link>
          </Button>
          {loan.asset ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={"/assets/" + loan.asset.id + "/edit"}>View Collateral Asset</Link>
            </Button>
          ) : null}
          {showUpload ? (
            <>
              <EditLinkButton href={"/loans/" + loan.id + "/edit"} />
              <DeleteEntryButton
                itemId={loan.id}
                itemLabel={loan.name}
                deleteAction={deleteLoan}
                redirectTo="/loans"
                title="Delete loan?"
                description="This will permanently delete the loan record and all uploaded documents."
              />
            </>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Loan Details</CardTitle>
              <CardDescription>
                {LIABILITY_TYPE_LABELS[loan.type] ?? loan.type}
                {loan.lender ? " · " + loan.lender : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Status" value={<Badge variant="secondary">{LIABILITY_STATUS_LABELS[loan.status] ?? loan.status}</Badge>} />
              <Detail label="Entity" value={loan.entity.name} />
              <Detail label="Principal" value={formatMoney(loan.amount, loan.currency)} />
              <Detail label="Outstanding Balance" value={formatMoney(balance, loan.currency)} />
              <Detail label="Interest Rate" value={loan.interestRate ? loan.interestRate.toString() + "%" : null} />
              <Detail label="Account Reference" value={loan.accountReference} />
              <Detail label="Start Date" value={formatDate(loan.startDate)} />
              <Detail label="Maturity Date" value={formatDate(loan.maturityDate)} />
              <Detail label="Payment Amount" value={loan.paymentAmount ? formatMoney(loan.paymentAmount, loan.currency) : null} />
              <Detail label="Payment Frequency" value={loan.paymentFrequency ? PAYMENT_FREQUENCY_LABELS[loan.paymentFrequency] ?? loan.paymentFrequency : null} />
              <Detail label="Collateral" value={loan.asset?.name} />
              {loan.notes ? (
                <div className="sm:col-span-2">
                  <Detail label="Notes" value={loan.notes} />
                </div>
              ) : null}
            </CardContent>
          </Card>
          {showUpload ? <UploadLoanDocumentsForm liabilityId={loan.id} /> : null}
          {showUpload && loan.status === "ACTIVE" ? (
            <RecordLoanPaymentForm
              liabilityId={loan.id}
              currency={loan.currency}
              outstandingBalance={formatDecimalInput(balance) ?? "0"}
              defaultPaymentAmount={loan.paymentAmount ? formatDecimalInput(loan.paymentAmount) : null}
            />
          ) : null}
        </div>

        <LoanPaymentHistory
          payments={loan.payments}
          currency={loan.currency}
          principalAmount={loan.amount}
          showActions={showUpload}
        />

        <Card>
          <CardHeader>
            <CardTitle>Lender Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Detail label="Name" value={loan.contactName} />
            <Detail label="Email" value={loan.contactEmail} />
            <Detail label="Phone" value={loan.contactPhone} />
          </CardContent>
        </Card>

        {(["LOAN_AGREEMENT", "PAYMENT_SCHEDULE", "STATEMENT", "OTHER"] as const).map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{LOAN_DOCUMENT_TYPE_LABELS[type]}</CardTitle>
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
                        <a href={fileHref("loan", doc.id)} target="_blank" rel="noopener noreferrer">
                          Open
                        </a>
                      </Button>
                      {showUpload ? (
                        <DeleteEntryButton
                          itemId={doc.id}
                          itemLabel={doc.label ?? doc.fileName}
                          deleteAction={deleteLoanDocument}
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
