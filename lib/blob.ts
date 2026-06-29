import { del } from "@vercel/blob";

export async function deleteBlobUrl(url: string) {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;

  try {
    await del(url, { token });
  } catch {
    // Blob may already be removed; continue with DB delete.
  }
}
