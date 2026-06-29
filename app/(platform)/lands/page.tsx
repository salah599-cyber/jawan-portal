import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { LandsTable } from "@/components/lands/lands-table";
import { listLands } from "@/lib/actions/lands";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LandsPage() {
  const ctx = await requireModuleAccess("LANDS");
  const lands = await listLands();
  const showAdd = canWrite(ctx, "LANDS");

  return (
    <>
      <PlatformHeader title="Lands" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Oman Lands</CardTitle>
              <CardDescription>
                Empty land parcels in Oman — click a row to view full details, record a sale, and manage documents.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/lands/new" label="Register Land" /> : null}
          </CardHeader>
          <CardContent>
            {lands.length === 0 ? (
              <p className="text-sm text-muted-foreground">No land parcels registered yet.</p>
            ) : (
              <LandsTable lands={lands} showActions={showAdd} />
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
