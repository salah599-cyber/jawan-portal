import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { deleteLoanPayment, deleteLoanPaymentDocument } from "@/lib/actions/loan-payments";
import { fileHref } from "@/lib/files/href";
import { LOAN_PAYMENT_METHOD_LABELS } from "@/lib/labels";
import { formatMoney, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type LoanPaymentRow = {
  id: string;
  paymentDate: Date | string;
  amount: { toString(): string };
  currency: string;
  paymentMethod: string;
  reference: string | null;
  principalPortion: { toString(): string } | null;
  interestPortion: { toString(): string } | null;
  balanceAfter: { toString(): string };
  notes: string | null;
  documents: {
    id: string;
    fileName: string;
    fileUrl: string;
    label: string | null;
  }[];
};

export function LoanPaymentHistory({
  payments,
  currency,
  principalAmount,
  showActions = false,
}: {
  payments: LoanPaymentRow[];
  currency: string;
  principalAmount: { toString(): string };
  showActions?: boolean;
}) {
  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
        <CardDescription>
          {payments.length} payment{payments.length === 1 ? "" : "s"}
          {payments.length > 0
            ? " · " + formatMoney(totalPaid, currency) + " paid of " + formatMoney(principalAmount, currency) + " principal"
            : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Receipt</TableHead>
                {showActions ? <TableHead className="w-[60px]" /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                  <TableCell className="text-right">{formatMoney(payment.amount, payment.currency)}</TableCell>
                  <TableCell>{LOAN_PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</TableCell>
                  <TableCell>{payment.reference ?? "—"}</TableCell>
                  <TableCell className="text-right">{formatMoney(payment.balanceAfter, payment.currency)}</TableCell>
                  <TableCell>
                    {payment.documents.length === 0 ? (
                      "—"
                    ) : (
                      <div className="flex flex-col gap-1">
                        {payment.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center gap-1">
                            <Button variant="link" className="h-auto p-0 text-xs" asChild>
                              <a href={fileHref("loan-payment", doc.id)} target="_blank" rel="noopener noreferrer">
                                {doc.label ?? doc.fileName}
                              </a>
                            </Button>
                            {showActions ? (
                              <DeleteEntryButton
                                itemId={doc.id}
                                itemLabel={doc.label ?? doc.fileName}
                                deleteAction={deleteLoanPaymentDocument}
                                title="Delete receipt?"
                              />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  {showActions ? (
                    <TableCell>
                      <DeleteEntryButton
                        itemId={payment.id}
                        itemLabel={formatMoney(payment.amount, payment.currency) + " on " + formatDate(payment.paymentDate)}
                        deleteAction={deleteLoanPayment}
                        title="Delete payment?"
                        description="This will reverse the outstanding balance adjustment."
                      />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
