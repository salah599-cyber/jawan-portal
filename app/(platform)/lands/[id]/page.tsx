import Link from "next/link";
import { notFound } from "next/navigation";
import { PlatformHeader } from "@/components/platform/platform-header";
import { DeleteEntryButton } from "@/components/platform/delete-entry-button";
import { EditLinkButton } from "@/components/platform/edit-link-button";
import { LandDetailContent } from "@/components/lands/land-detail-content";
import { getLand, deleteLand } from "@/lib/actions/lands";
import { buildFileAccessContext } from "@/lib/files/download-access";
import { collectLandFileRefs } from "@/lib/files/download-types";
import { canWrite, requireModuleAccess } from "@/lib/permissions/access";
import { Button } from "@/components/ui/button";

export default async function LandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireModuleAccess("LANDS");
  const land = await getLand(id);
  if (!land) notFound();

  const showActions = canWrite(ctx, "LANDS");
  const fileAccess = await buildFileAccessContext(ctx, collectLandFileRefs(land));

  return (
    <>
      <PlatformHeader title={land.name} />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/lands">Back to Lands</Link>
          </Button>
          {showActions ? (
            <>
              <EditLinkButton href={"/lands/" + land.id + "/edit"} />
              <DeleteEntryButton
                itemId={land.id}
                itemLabel={land.name}
                deleteAction={deleteLand}
                redirectTo="/lands"
                title="Delete land parcel?"
                description="This will permanently delete the land parcel, linked asset, sale records, and all uploaded documents."
              />
            </>
          ) : null}
        </div>

        <LandDetailContent land={land} showActions={showActions} fileAccess={fileAccess} />
      </main>
    </>
  );
}
