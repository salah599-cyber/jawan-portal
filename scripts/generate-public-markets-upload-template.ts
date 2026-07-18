/**
 * Generates sample Excel files for Public Markets brokerage upload.
 * Usage:
 *   npx tsx scripts/generate-public-markets-upload-template.ts [market] [outputPath]
 *   npx tsx scripts/generate-public-markets-upload-template.ts --all
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildUploadTemplateBuffer,
  isUploadTemplateMarket,
} from "../lib/public-markets/upload-template";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "..", "public", "templates");

function writeTemplate(market: string, outputPath?: string) {
  const normalizedMarket = market.toUpperCase();
  if (!isUploadTemplateMarket(normalizedMarket)) {
    throw new Error(`Unknown market "${market}". Supported: MSX, USA`);
  }

  const { buffer, fileName } = buildUploadTemplateBuffer(normalizedMarket);
  const resolvedPath = path.resolve(outputPath || path.join(TEMPLATES_DIR, fileName));
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, buffer);
  console.log(`Created: ${resolvedPath}`);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    for (const market of ["MSX", "USA"] as const) {
      writeTemplate(market);
    }
    return;
  }

  writeTemplate(args[0] || "MSX", args[1]);
}

main();
