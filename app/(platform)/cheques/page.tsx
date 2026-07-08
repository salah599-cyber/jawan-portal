import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { ChequesTable } from "@/components/cheques/cheques-table";
import { listCheques } from "@/lib/actions/cheques";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ChequesPage() {
  const ctx = await requireModuleAccess("CHEQUES");
  const cheques = await listCheques();
  const showAdd = canWrite(ctx, "CHEQUES");

  const pending = cheques.filter((c) => c.status === "PENDING" || c.status === "DEPOSITED");
  const pendingIssued = pending.filter((c) => c.direction === "ISSUED");
  const pendingReceived = pending.filter((c) => c.direction === "RECEIVED");
  const bounced = cheques.filter((c) => c.status === "BOUNCED");

  const now = new Date();
  const weekAhead = new Date(now);
  weekAhead.setDate(weekAhead.getDate() + 7);
  const dueThisWeek = pending.filter((c) => c.dueDate && c.dueDate <= weekAhead);

  return (
    <>
      <PlatformHeader title="Cheque Management" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending outgoing</CardDescription>
              <CardTitle className="text-2xl">{pendingIssued.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending incoming</CardDescription>
              <CardTitle className="text-2xl">{pendingReceived.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Due this week</CardDescription>
              <CardTitle className="text-2xl">{dueThisWeek.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Bounced</CardDescription>
              <CardTitle className="text-2xl">{bounced.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Cheque Register</CardTitle>
              <CardDescription>
                Track issued and received cheques — {cheques.length} on record.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/cheques/new" label="Register Cheque" /> : null}
          </CardHeader>
          <CardContent>
            <ChequesTable cheques={cheques} showAdd={showAdd} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
