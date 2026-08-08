import { describe, expect, it } from "vitest";
import {
  assertOwnedDocumentVaultUrl,
  assertOwnedPendingProposalDeckUrl,
} from "@/lib/blob/client-upload-shared";

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

describe("assertOwnedDocumentVaultUrl", () => {
  const userId = "user_abc";

  it("accepts a private blob URL owned by the user", () => {
    expect(() =>
      assertOwnedDocumentVaultUrl(
        `https://store.private.blob.vercel-storage.com/documents/${userId}/deck.pdf`,
        userId,
      ),
    ).not.toThrow();
  });

  it("rejects URLs for another user", () => {
    expect(() =>
      assertOwnedDocumentVaultUrl(
        "https://store.private.blob.vercel-storage.com/documents/other/deck.pdf",
        userId,
      ),
    ).toThrow(/invalid document/i);
  });

  it("rejects non-blob hosts", () => {
    expect(() =>
      assertOwnedDocumentVaultUrl(
        `https://evil.example.com/documents/${userId}/deck.pdf`,
        userId,
      ),
    ).toThrow(/invalid document/i);
  });
});
