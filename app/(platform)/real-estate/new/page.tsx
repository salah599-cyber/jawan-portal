import Link from "next/link";
import { PlatformHeader } from "@/components/platform/platform-header";
import { CreatePropertyForm } from "@/components/real-estate/create-property-form";
import { listRePortfolioEntities } from "@/lib/data/real-estate";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function NewPropertyPage() {
  const ctx = await requireModuleAccess("REAL_ESTATE");
  if (!canWrite(ctx, "REAL_ESTATE")) redirect("/real-estate");

  const entities = await listRePortfolioEntities(ctx);

  return (
    <>
      <PlatformHeader title="Add Property" />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">New Property</h2>
            <p className="text-sm text-muted-foreground">
              Register a building, land parcel, or commercial block with optional units.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/real-estate">Cancel</Link>
          </Button>
        </div>
        <CreatePropertyForm entities={entities} />
      </main>
    </>
  );
}
