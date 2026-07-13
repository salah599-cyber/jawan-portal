import { describe, expect, it } from "vitest";
import { assertOwnedPendingProposalDeckUrl } from "@/lib/blob/client-upload-shared";

describe("assertOwnedPendingProposalDeckUrl", () => {
  const userId = "user_abc";

  it("accepts a private blob URL owned by the user", () => {
    expect(() =>
      assertOwnedPendingProposalDeckUrl(
        `https://store.private.blob.vercel-storage.com/proposals/pending/${userId}/deck.pdf`,
        userId,
      ),
    ).not.toThrow();
  });

  it("rejects URLs for another user", () => {
    expect(() =>
      assertOwnedPendingProposalDeckUrl(
        "https://store.private.blob.vercel-storage.com/proposals/pending/other/deck.pdf",
        userId,
      ),
    ).toThrow(/invalid deck/i);
  });

  it("rejects non-blob hosts", () => {
    expect(() =>
      assertOwnedPendingProposalDeckUrl(
        `https://evil.example.com/proposals/pending/${userId}/deck.pdf`,
        userId,
      ),
    ).toThrow(/invalid deck/i);
  });
});
