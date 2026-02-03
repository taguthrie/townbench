/**
 * Download and parse budget PDFs from major NH cities.
 * Cities use different reporting formats than towns, so their data
 * isn't in the NHPFC voted appropriations dataset.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(__dirname, "../data/nh/city-budgets");

// Major NH cities and their budget PDF URLs
const CITY_BUDGETS: { city: string; fiscalYear: number; url: string; type: string }[] = [
  // Dover - FY2025 Budget
  {
    city: "Dover",
    fiscalYear: 2025,
    url: "https://www.dover.nh.gov/Assets/government/open-government/budget-revealed/FY2025-documents/citycouncil-documents/FY2025%20Budget%20Presentation%20Slides.pdf",
    type: "presentation",
  },
  // Concord - FY2024 General Government Budget
  {
    city: "Concord",
    fiscalYear: 2024,
    url: "https://www.concordnh.gov/DocumentCenter/View/20301/FY24-Adopted-Budget-General-Government",
    type: "adopted_budget",
  },
  // Rochester - FY2024 Adopted Budget
  {
    city: "Rochester",
    fiscalYear: 2024,
    url: "https://www.rochesternh.gov/sites/g/files/vyhlif9211/f/uploads/fy24_adopted_om_budget-website.pdf",
    type: "adopted_budget",
  },
  // Keene - FY2024 Operating Budget
  {
    city: "Keene",
    fiscalYear: 2024,
    url: "https://keenenh.gov/sites/default/files/Finance/CityOfKeene2024OperatingBudget.pdf",
    type: "adopted_budget",
  },
  // Portsmouth - FY2025 Proposed Budget
  {
    city: "Portsmouth",
    fiscalYear: 2025,
    url: "https://files.portsmouthnh.gov/finance/FY25/FY25ProposedBudget-OnlineVersion.pdf",
    type: "proposed_budget",
  },
  // Claremont - FY2026 Approved Budget
  {
    city: "Claremont",
    fiscalYear: 2026,
    url: "https://www.claremontnh.com/corecode/uploads/document6/uploaded_pdfs/corecode/FY26_APPROVED%20BUDGET%20BOOK_ONLINE_5495.pdf",
    type: "adopted_budget",
  },
  // Berlin - 2024 Final Budget
  {
    city: "Berlin",
    fiscalYear: 2024,
    url: "https://www.berlinnh.gov/sites/g/files/vyhlif2811/f/uploads/2024_final_budget.pdf",
    type: "adopted_budget",
  },
  // Franklin - FY2026 Council Adopted Budget
  {
    city: "Franklin",
    fiscalYear: 2026,
    url: "https://www.franklinnh.gov/sites/g/files/vyhlif601/f/uploads/fy2026_council_adopted_budget_0.pdf",
    type: "adopted_budget",
  },
];

async function downloadPdf(url: string, outputPath: string): Promise<boolean> {
  try {
    console.log(`  Downloading: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      console.log(`    Failed: HTTP ${response.status}`);
      return false;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      console.log(`    Not a PDF (content-type: ${contentType})`);
      // Save anyway to inspect
      const text = await response.text();
      writeFileSync(outputPath.replace(".pdf", ".html"), text);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(outputPath, buffer);
    console.log(`    Saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.log(`    Error: ${err}`);
    return false;
  }
}

async function main() {
  console.log("Downloading NH city budget PDFs...\n");
  mkdirSync(DATA_DIR, { recursive: true });

  const results: { city: string; fiscalYear: number; file: string; success: boolean }[] = [];

  for (const budget of CITY_BUDGETS) {
    if (budget.type === "budget_page") {
      console.log(`${budget.city} FY${budget.fiscalYear}: Skipping (page URL, not direct PDF)`);
      continue;
    }

    console.log(`${budget.city} FY${budget.fiscalYear}:`);
    const filename = `${budget.city.toLowerCase()}_fy${budget.fiscalYear}_budget.pdf`;
    const outputPath = resolve(DATA_DIR, filename);

    if (existsSync(outputPath)) {
      console.log(`  Already exists: ${outputPath}`);
      results.push({ city: budget.city, fiscalYear: budget.fiscalYear, file: filename, success: true });
      continue;
    }

    const success = await downloadPdf(budget.url, outputPath);
    results.push({ city: budget.city, fiscalYear: budget.fiscalYear, file: filename, success });
  }

  console.log("\n=== Summary ===");
  for (const r of results) {
    console.log(`${r.city} FY${r.fiscalYear}: ${r.success ? "OK" : "FAILED"} - ${r.file}`);
  }

  // Save manifest
  writeFileSync(resolve(DATA_DIR, "manifest.json"), JSON.stringify(results, null, 2));
  console.log(`\nManifest saved to ${DATA_DIR}/manifest.json`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
