import { PlatformHeader } from "@/components/platform/platform-header";
import { AddLinkButton } from "@/components/platform/add-link-button";
import { CarsTable } from "@/components/cars/cars-table";
import { listCars } from "@/lib/actions/cars";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CarsPage() {
  const ctx = await requireModuleAccess("CARS");
  const cars = await listCars();
  const showAdd = canWrite(ctx, "CARS");

  return (
    <>
      <PlatformHeader title="Cars" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Oman Vehicles</CardTitle>
              <CardDescription>
                Owned cars registered in Oman — Motor Vehicle License (Mulkia) details and documents.
              </CardDescription>
            </div>
            {showAdd ? <AddLinkButton href="/cars/new" label="Register Vehicle" /> : null}
          </CardHeader>
          <CardContent>
            <CarsTable cars={cars} showAdd={showAdd} />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
