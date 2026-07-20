import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { BankAccountsTable } from "@/components/bank/bank-accounts-table";
import { listBankAccounts } from "@/lib/actions/bank-accounts";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BankDetailsPage() {
  const ctx = await requireModuleAccess("ASSETS");
  const accounts = await listBankAccounts();
  const showAdd = canWrite(ctx, "ASSETS");

  const omanAccounts = accounts.filter((account) => account.region === "OMAN");
  const usaAccounts = accounts.filter((account) => account.region === "USA");

  return (
    <>
      <PlatformHeader title="Bank Details" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Oman & International</CardTitle>
              <CardDescription>Family bank accounts in Oman and other non-US jurisdictions.</CardDescription>
            </div>
            {showAdd ? (
              <AddLinkButton href="/assets/bank-details/new" label="Add Bank Account" />
            ) : null}
          </CardHeader>
          <CardContent>
            <BankAccountsTable accounts={omanAccounts} showActions={showAdd} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>USA Bank Accounts</CardTitle>
              <CardDescription>US bank accounts with routing numbers and USD account lines.</CardDescription>
            </div>
            {showAdd ? (
              <AddLinkButton href="/assets/bank-details/new?region=USA" label="Add USA Bank Account" />
            ) : null}
          </CardHeader>
          <CardContent>
            <BankAccountsTable accounts={usaAccounts} showActions={showAdd} showRegion />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
