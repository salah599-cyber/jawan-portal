import { describe, expect, it } from "vitest";
import { fileHref } from "@/lib/files/href";
import {
  fileRequestKey,
  validateDownloadRequestReason,
  MIN_DOWNLOAD_REQUEST_REASON_LENGTH,
} from "@/lib/files/download-types";

describe("fileHref", () => {
  it("builds preview URLs without download query", () => {
    expect(fileHref("document", "doc-1")).toBe("/api/files/document/doc-1");
  });

  it("adds download query when requested", () => {
    expect(fileHref("vehicle", "veh-1", { download: true })).toBe(
      "/api/files/vehicle/veh-1?download=1",
    );
  });
});

describe("validateDownloadRequestReason", () => {
  it("requires a minimum length", () => {
    expect(() => validateDownloadRequestReason("short")).toThrow(
      `Please provide a reason of at least ${MIN_DOWNLOAD_REQUEST_REASON_LENGTH} characters.`,
    );
  });

  it("returns trimmed valid reasons", () => {
    expect(validateDownloadRequestReason("  Need this for audit review.  ")).toBe(
      "Need this for audit review.",
    );
  });
});

describe("fileRequestKey", () => {
  it("combines kind and file id", () => {
    expect(fileRequestKey("loan", "abc")).toBe("loan:abc");
  });
});
