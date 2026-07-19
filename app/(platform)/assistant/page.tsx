import { PlatformHeader } from "@/components/platform/platform-header";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { requireModuleAccess } from "@/lib/permissions/access";

export default async function AssistantPage() {
  await requireModuleAccess("DASHBOARD");

  return (
    <>
      <PlatformHeader title="Assistant" />
      <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
        <AssistantChat />
      </main>
    </>
  );
}
