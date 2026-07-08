import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { RePrivatePropertyForm } from "@/components/real-estate/private/re-private-property-form";
import {
  getPrivateProperty,
  listPrivatePortfolioEntities,
} from "@/lib/data/private-real-estate";
import { serializePrivateProperty } from "@/lib/real-estate/serialize-private";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";

export default async function EditPrivatePropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await requireModuleAccess("REAL_ESTATE");
  if (!canWrite(ctx, "REAL_ESTATE")) redirect(`/real-estate/private/${id}`);

  const [property, entities] = await Promise.all([
    getPrivateProperty(id, ctx),
    listPrivatePortfolioEntities(ctx),
  ]);
  if (!property) notFound();

  return (
    <>
      <PlatformHeader title={`Edit ${property.name}`} />
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Edit Family Villa</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/real-estate/private/${id}`}>Cancel</Link>
          </Button>
        </div>
        <RePrivatePropertyForm
          entities={entities}
          property={serializePrivateProperty(property)}
        />
      </main>
    </>
  );
}
