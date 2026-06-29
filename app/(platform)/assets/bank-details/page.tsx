import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { listBankAccounts } from "@/lib/actions/bank-accounts";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function BankDetailsPage() {
  const ctx = await requireModuleAccess("ASSETS");
  const accounts = await listBankAccounts();
  const showAdd = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="Bank Details" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Bank Details</CardTitle>
              <CardDescription>Family bank account registry.</CardDescription>
            </div>
            {showAdd ? (
              <AddLinkButton href="/assets/bank-details/new" label="Add Bank Account" />
            ) : null}
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank accounts registered yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account Name</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Account Number</TableHead>
                    <TableHead>IBAN</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">{account.accountName}</TableCell>
                      <TableCell>{account.bankName}</TableCell>
                      <TableCell>{account.accountNumber}</TableCell>
                      <TableCell>{account.iban ?? "—"}</TableCell>
                      <TableCell>{account.currency}</TableCell>
                      <TableCell>{account.entity?.name ?? "—"}</TableCell>
                      <TableCell>{formatDate(account.updatedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
