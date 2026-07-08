import { describe, expect, it } from "vitest";
import { assertValidUploadFile, buildUploadPathname, sanitizeFileName } from "@/lib/blob";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";

function makeFile(name: string, sizeBytes: number, type = "application/pdf"): File {
  return new File([new Uint8Array(Math.max(0, sizeBytes))], name, { type });
}

describe("sanitizeFileName", () => {
  it("strips directory components from unix and windows-style paths", () => {
    expect(sanitizeFileName("/etc/passwd")).toBe("passwd");
    expect(sanitizeFileName("C:\\Windows\\System32\\evil.exe")).toBe("evil.exe");
    expect(sanitizeFileName("../../secrets.txt")).toBe("secrets.txt");
  });

  it("replaces unsafe characters with underscores", () => {
    expect(sanitizeFileName("my file (final) v2.pdf")).toBe("my_file__final__v2.pdf");
  });

  it("falls back to a default name for empty or fully-unsafe input", () => {
    expect(sanitizeFileName("")).toBe("file");
    expect(sanitizeFileName("///")).toBe("file");
  });

  it("truncates excessively long file names", () => {
    const longName = "a".repeat(300) + ".pdf";
    const result = sanitizeFileName(longName);
    expect(result.length).toBeLessThanOrEqual(150);
  });
});

describe("buildUploadPathname", () => {
  it("joins sanitized segments with a uniquified, sanitized file name", () => {
    const pathname = buildUploadPathname(["documents", "user-123"], "My Report.pdf");
    const parts = pathname.split("/");
    expect(parts[0]).toBe("documents");
    expect(parts[1]).toBe("user-123");
    expect(parts[2]).toMatch(/^[a-z0-9]+-[a-f0-9]{8}-My_Report\.pdf$/);
  });

  it("sanitizes unsafe characters out of segments (defense in depth against path traversal)", () => {
    const pathname = buildUploadPathname(["../../etc", "passwd"], "file.pdf");
    expect(pathname).not.toContain("..");
    expect(pathname.split("/")).toHaveLength(3);
  });

  it("produces unique pathnames for repeated calls with the same inputs", () => {
    const first = buildUploadPathname(["documents"], "same.pdf");
    const second = buildUploadPathname(["documents"], "same.pdf");
    expect(first).not.toBe(second);
  });
});

describe("assertValidUploadFile", () => {
  it("throws when no file (or an empty file) is provided", () => {
    expect(() => assertValidUploadFile(makeFile("empty.pdf", 0))).toThrow(/required/i);
  });

  it("throws when the file exceeds the max size", () => {
    expect(() => assertValidUploadFile(makeFile("big.pdf", MAX_UPLOAD_BYTES + 1))).toThrow(/too large/i);
  });

  it("throws for disallowed extensions", () => {
    expect(() => assertValidUploadFile(makeFile("payload.exe", 1024))).toThrow(/unsupported file type/i);
  });

  it("does not throw for a valid, allowed file", () => {
    expect(() => assertValidUploadFile(makeFile("statement.pdf", 1024))).not.toThrow();
  });
});
