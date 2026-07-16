import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { TransferLettersTable } from "@/components/transfer-letters/transfer-letters-table";
import { listTransferLetters } from "@/lib/actions/transfer-letters";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function TransferLettersPage() {
  const ctx = await requireModuleAccess("ASSETS");
  const letters = await listTransferLetters();
  const showAdd = canWrite(ctx, "ASSETS");

  return (
    <>
      <PlatformHeader title="Transfer Letters" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Transfer Letter Register</CardTitle>
              <CardDescription>
                Record and print wire transfer letters for local, international, and UK transfers — {letters.length} on record.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/transfer-letters/new" label="New Transfer Letter" /> : null}
          </CardHeader>
          <CardContent>
            <TransferLettersTable letters={letters} showActions={showAdd} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
