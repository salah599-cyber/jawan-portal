import { redirect } from "next/navigation";
import { SignInPanel } from "@/components/auth/sign-in-panel";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; __clerk_ticket?: string; __clerk_invitation_token?: string }>;
}) {
  const params = await searchParams;
  const { reason } = params;

  if (params.__clerk_ticket || params.__clerk_invitation_token) {
    const query = new URLSearchParams();
    if (params.__clerk_ticket) query.set("__clerk_ticket", params.__clerk_ticket);
    if (params.__clerk_invitation_token) {
      query.set("__clerk_invitation_token", params.__clerk_invitation_token);
    }
    redirect(`/sign-up?${query.toString()}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <SignInPanel reason={reason} />
    </div>
  );
}
