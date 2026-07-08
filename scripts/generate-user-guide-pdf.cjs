const fs = require("fs");
const path = require("path");
const { marked } = require("marked");
const puppeteer = require("puppeteer-core");

const ROOT = path.join(__dirname, "..");
const MD_PATH = path.join(ROOT, "docs", "Jawan-User-Guide.md");
const CSS_PATH = path.join(ROOT, "docs", "pdf-styles.css");
const HTML_PATH = path.join(ROOT, "docs", "Jawan-User-Guide.html");
const PDF_NAME = process.argv[2] || "Jawan-User-Guide.pdf";
const PDF_PATH = path.join(ROOT, "docs", PDF_NAME);

const BROWSER_CANDIDATES = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];

function findBrowser() {
  for (const candidate of BROWSER_CANDIDATES) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error("Chrome or Edge not found for PDF generation.");
}

async function main() {
  const markdown = fs.readFileSync(MD_PATH, "utf8");
  const css = fs.readFileSync(CSS_PATH, "utf8");
  const body = marked.parse(markdown);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Jawan Investments — User Guide</title>
  <style>${css}</style>
</head>
<body class="user-guide">${body}</body>
</html>`;

  fs.writeFileSync(HTML_PATH, html, "utf8");

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.goto(`file:///${HTML_PATH.replace(/\\/g, "/")}`, {
      waitUntil: "networkidle0",
    });
    await page.pdf({
      path: PDF_PATH,
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "18mm", bottom: "20mm", left: "18mm" },
      displayHeaderFooter: true,
      headerTemplate: "<span></span>",
      footerTemplate:
        '<div style="width:100%;font-size:9px;color:#666;text-align:center;padding:0 18mm;">Jawan Investments — User Guide · Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
    });
  } finally {
    await browser.close();
  }

  const stats = fs.statSync(PDF_PATH);
  console.log(`PDF written: ${PDF_PATH} (${Math.round(stats.size / 1024)} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
