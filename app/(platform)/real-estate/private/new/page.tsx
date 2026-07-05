import Link from "next/link";
import { redirect } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { RePrivatePropertyForm } from "@/components/real-estate/private/re-private-property-form";
import { listPrivatePortfolioEntities } from "@/lib/data/private-real-estate";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";

export default async function NewPrivatePropertyPage() {
  const ctx = await requireModuleAccess("REAL_ESTATE");
  if (!canWrite(ctx, "REAL_ESTATE")) redirect("/real-estate/private");

  const entities = await listPrivatePortfolioEntities(ctx);

  return (
    <>
      <PlatformHeader title="Add Family Villa" />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">New Family Villa</h2>
            <p className="text-sm text-muted-foreground">
              Register a family-owned villa with deed details, running costs, and staff tracking.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/real-estate/private">Cancel</Link>
          </Button>
        </div>
        <RePrivatePropertyForm entities={entities} />
      </main>
    </>
  );
}
