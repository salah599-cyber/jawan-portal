import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { EditPropertyForm } from "@/components/real-estate/edit-property-form";
import { getProperty, listRePortfolioEntities } from "@/lib/data/real-estate";
import { serializeReProperty } from "@/lib/real-estate/serialize";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("REAL_ESTATE");
  if (!canWrite(ctx, "REAL_ESTATE")) redirect(`/real-estate/${id}`);

  const [property, entities] = await Promise.all([
    getProperty(id, ctx),
    listRePortfolioEntities(ctx),
  ]);
  if (!property) notFound();
  if (property.portfolioTrack === "PRIVATE") redirect(`/real-estate/private/${id}/edit`);

  return (
    <>
      <PlatformHeader title={`Edit ${property.name}`} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Edit Property</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/real-estate/${id}`}>Cancel</Link>
          </Button>
        </div>
        <EditPropertyForm property={serializeReProperty(property)} entities={entities} />
      </main>
    </>
  );
}
