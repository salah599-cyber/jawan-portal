import {
  buildUploadTemplateBuffer,
  isUploadTemplateMarket,
} from "@/lib/public-markets/upload-template";

export async function GET(request: Request) {
  const market = new URL(request.url).searchParams.get("market")?.toUpperCase() ?? "MSX";

  if (!isUploadTemplateMarket(market)) {
    return Response.json({ error: "Unsupported market." }, { status: 404 });
  }

  const { buffer, fileName } = buildUploadTemplateBuffer(market);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
