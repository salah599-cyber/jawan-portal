type PdfRuntime = {
  PDFParse: typeof import("pdf-parse").PDFParse;
  CanvasFactory: typeof import("pdf-parse/worker").CanvasFactory;
};

let runtimePromise: Promise<PdfRuntime> | null = null;

async function ensurePdfPolyfills() {
  try {
    const canvas = await import("@napi-rs/canvas");
    const globals = globalThis as Record<string, unknown>;

    if (!globals.DOMMatrix) globals.DOMMatrix = canvas.DOMMatrix;
    if (!globals.Path2D) globals.Path2D = canvas.Path2D;
    if (!globals.ImageData) globals.ImageData = canvas.ImageData;
    if (!globals.Image) globals.Image = canvas.Image;
  } catch {
    // CanvasFactory from pdf-parse/worker should still provide rendering support.
  }
}

export function loadPdfRuntime(): Promise<PdfRuntime> {
  if (!runtimePromise) {
    runtimePromise = (async () => {
      await ensurePdfPolyfills();
      await import("pdf-parse/worker");

      const [{ PDFParse }, { CanvasFactory }] = await Promise.all([
        import("pdf-parse"),
        import("pdf-parse/worker"),
      ]);

      return { PDFParse, CanvasFactory };
    })();
  }

  return runtimePromise;
}
