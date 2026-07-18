"use client";

export function downloadExcelBase64File(result: {
  fileName: string;
  base64: string;
  mimeType?: string;
}) {
  const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
  const blob = new Blob([bytes], {
    type: result.mimeType ?? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = result.fileName;
  link.click();
  URL.revokeObjectURL(url);
}
