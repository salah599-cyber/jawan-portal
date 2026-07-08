import { describe, expect, it } from "vitest";
import {
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_BYTES,
  validateUploadFile,
  validateUploadFileSize,
} from "@/lib/upload-limits";

function makeFile(name: string, sizeBytes: number, type = "application/octet-stream"): File {
  const bytes = new Uint8Array(Math.max(0, sizeBytes));
  return new File([bytes], name, { type });
}

describe("validateUploadFileSize", () => {
  it("accepts files at or below the limit", () => {
    expect(validateUploadFileSize(makeFile("a.pdf", MAX_UPLOAD_BYTES))).toBeNull();
    expect(validateUploadFileSize(makeFile("a.pdf", 1024))).toBeNull();
  });

  it("rejects files over the limit with a human-readable message", () => {
    const error = validateUploadFileSize(makeFile("a.pdf", MAX_UPLOAD_BYTES + 1));
    expect(error).toContain("too large");
    expect(error).toContain("14 MB" /* MAX_UPLOAD_LABEL */);
  });
});

describe("validateUploadFile", () => {
  it("accepts every allowed extension", () => {
    for (const ext of ALLOWED_UPLOAD_EXTENSIONS) {
      expect(validateUploadFile(makeFile(`document.${ext}`, 1024))).toBeNull();
    }
  });

  it("rejects disallowed extensions", () => {
    expect(validateUploadFile(makeFile("script.exe", 1024))).toMatch(/unsupported file type/i);
    expect(validateUploadFile(makeFile("archive.zip", 1024))).toMatch(/unsupported file type/i);
  });

  it("rejects files with no extension", () => {
    expect(validateUploadFile(makeFile("README", 1024))).toMatch(/unsupported file type/i);
  });

  it("checks size before type, surfacing the size error first", () => {
    const error = validateUploadFile(makeFile("huge.exe", MAX_UPLOAD_BYTES + 1));
    expect(error).toContain("too large");
  });

  it("is case-insensitive for extensions", () => {
    expect(validateUploadFile(makeFile("SCAN.PDF", 1024))).toBeNull();
  });
});
