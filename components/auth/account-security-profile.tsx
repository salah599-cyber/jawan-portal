"use client";

import { UserProfile } from "@clerk/nextjs";

const appearance = {
  elements: {
    rootBox: "w-full min-h-[24rem]",
    card: "shadow-none border-0 w-full max-w-3xl",
    navbar: "w-full",
    pageScrollBox: "w-full",
  },
};

export function AccountSecurityProfile({ securityOnly = false }: { securityOnly?: boolean }) {
  if (securityOnly) {
    return (
      <UserProfile routing="path" path="/account" appearance={appearance}>
        <UserProfile.Page label="security" />
      </UserProfile>
    );
  }

  return <UserProfile routing="path" path="/account" appearance={appearance} />;
}
