import { InviteRequiredPanel } from "@/components/auth/invite-required-panel";

export default async function InviteRequiredPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <InviteRequiredPanel reason={reason} />
    </div>
  );
}
