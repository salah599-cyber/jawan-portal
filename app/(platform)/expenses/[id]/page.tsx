import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { UploadExpenseAttachmentsForm } from "@/components/expenses/upload-expense-attachments-form";
import { getExpense, deleteExpense, deleteExpenseAttachment } from "@/lib/actions/expenses";
import { FileActions } from "@/components/platform/file-actions";
import { buildFileAccessContext } from "@/lib/files/download-access";
import { fileRequestKey } from "@/lib/files/download-types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { EXPENSE_ATTACHMENT_TYPE_LABELS, EXPENSE_STATUS_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ExpenseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("EXPENSES");
  const expense = await getExpense(id);
  if (!expense) notFound();

  const showUpload = canWrite(ctx, "EXPENSES");
  const attachmentsByType = {
    INVOICE: expense.attachments.filter((a) => a.attachmentType === "INVOICE"),
    PAYMENT_SLIP: expense.attachments.filter((a) => a.attachmentType === "PAYMENT_SLIP"),
    CHEQUE_COPY: expense.attachments.filter((a) => a.attachmentType === "CHEQUE_COPY"),
    OTHER: expense.attachments.filter((a) => a.attachmentType === "OTHER"),
  };
  const fileAccess = await buildFileAccessContext(
    ctx,
    expense.attachments.map((doc) => ({ kind: "expense" as const, fileId: doc.id })),
  );

  return (
    <>
      <PlatformHeader title={expense.title} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/expenses">Back to Expenses</Link>
          </Button>
          {showUpload ? (
            <>
              <EditLinkButton href={"/expenses/" + expense.id + "/edit"} />
              <DeleteEntryButton
                itemId={expense.id}
                itemLabel={expense.title}
                deleteAction={deleteExpense}
                redirectTo="/expenses"
                title="Delete expense?"
                description="This will permanently delete the expense and all uploaded documents."
              />
            </>
          ) : null}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
              <CardDescription>{expense.expenseType?.name ?? expense.category}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Detail label="Amount" value={formatMoney(expense.amount, expense.currency)} />
              <Detail label="Status" value={<Badge variant="secondary">{EXPENSE_STATUS_LABELS[expense.status] ?? expense.status}</Badge>} />
              <Detail label="Expense Type" value={expense.expenseType?.name ?? expense.category} />
              <Detail label="Due Date" value={formatDate(expense.dueDate)} />
              <Detail label="Recurring" value={expense.isRecurring ? "Yes" : "No"} />
              <Detail label="Entity" value={expense.entity?.name} />
            </CardContent>
          </Card>
          {showUpload ? <UploadExpenseAttachmentsForm expenseId={expense.id} /> : null}
        </div>

        {(["INVOICE", "PAYMENT_SLIP", "CHEQUE_COPY", "OTHER"] as const).map((type) => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{EXPENSE_ATTACHMENT_TYPE_LABELS[type]}</CardTitle>
              <CardDescription>
                {attachmentsByType[type].length} document{attachmentsByType[type].length === 1 ? "" : "s"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {attachmentsByType[type].length === 0 ? (
                <p className="text-sm text-muted-foreground">No documents uploaded.</p>
              ) : (
                <ul className="space-y-2">
                  {attachmentsByType[type].map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between gap-4 text-sm">
                      <div>
                        <p className="font-medium">{doc.label ?? doc.fileName}</p>
                        <p className="text-muted-foreground">
                          {doc.fileName} - {formatDate(doc.createdAt)}
                        </p>
                      </div>
                      <FileActions
                        kind="expense"
                        fileId={doc.id}
                        fileName={doc.label ?? doc.fileName}
                        isSuperAdmin={fileAccess.isSuperAdmin}
                        requestStatus={fileAccess.downloadRequestStatuses[fileRequestKey("expense", doc.id)]}
                        compact
                      />
                      {showUpload ? (
                        <DeleteEntryButton
                          itemId={doc.id}
                          itemLabel={doc.label ?? doc.fileName}
                          deleteAction={deleteExpenseAttachment}
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
      <div className="mt-1 text-sm">{value ?? "—"}</div>
    </div>
  );
}
