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
  buildPortfolioUploadTemplateBuffer,
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

  return buildUploadTemplateBuffer(normalizedMarket).then(({ buffer, fileName }) => {
    const resolvedPath = path.resolve(outputPath || path.join(TEMPLATES_DIR, fileName));
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    fs.writeFileSync(resolvedPath, buffer);
    console.log(`Created: ${resolvedPath}`);
  });
}

async function writePortfolioTemplate(outputPath?: string) {
  const { buffer, fileName } = await buildPortfolioUploadTemplateBuffer();
  const resolvedPath = path.resolve(outputPath || path.join(TEMPLATES_DIR, fileName));
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, buffer);
  console.log(`Created: ${resolvedPath}`);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--all")) {
    for (const market of ["MSX", "USA"] as const) {
      await writeTemplate(market);
    }
    await writePortfolioTemplate();
    return;
  }

  if (args[0]?.toUpperCase() === "PORTFOLIO") {
    await writePortfolioTemplate(args[1]);
    return;
  }

  await writeTemplate(args[0] || "MSX", args[1]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
