import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/permissions/access";
import { canSubmitProposal } from "@/lib/proposals/submit-access";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/upload-limits";
import { PROPOSAL_DECK_PENDING_PREFIX } from "@/lib/blob/client-upload-shared";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const ctx = await getCurrentUserContext();
        if (!ctx) throw new Error("Unauthorized");

        let purpose = "generic";
        try {
          purpose = JSON.parse(clientPayload || "{}")?.purpose ?? "generic";
        } catch {
          throw new Error("Invalid upload payload.");
        }

        if (purpose === "proposal-deck") {
          if (!canSubmitProposal(ctx)) {
            throw new Error("You do not have permission to upload proposal decks.");
          }
          const expectedPrefix = `${PROPOSAL_DECK_PENDING_PREFIX}${ctx.id}/`;
          if (!pathname.startsWith(expectedPrefix)) {
            throw new Error("Invalid upload path.");
          }
        } else {
          throw new Error("Unsupported upload purpose.");
        }

        return {
          allowedContentTypes: [...ALLOWED_UPLOAD_MIME_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({ userId: ctx.id, purpose }),
        };
      },
      onUploadCompleted: async () => {
        // Proposal forms persist document rows after the client upload completes.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 400 },
    );
  }
}
