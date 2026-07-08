import { SignInPanel } from "@/components/auth/sign-in-panel";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <SignInPanel reason={reason} />
    </div>
  );
}
