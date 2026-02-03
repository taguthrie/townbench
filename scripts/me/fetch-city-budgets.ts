/**
 * Download budget PDFs from major Maine cities/towns.
 * Maine doesn't have centralized municipal budget reporting like NH's NHPFC,
 * so we need to collect individual city budget documents.
 */

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(__dirname, "../data/me/city-budgets");

// Major Maine cities and their budget PDF URLs
const CITY_BUDGETS: { city: string; fiscalYear: number; url: string; type: string }[] = [
  // Lewiston - FY2026 Municipal Budget (already downloaded)
  {
    city: "Lewiston",
    fiscalYear: 2026,
    url: "https://www.lewistonmaine.gov/ArchiveCenter/ViewFile/Item/6505",
    type: "adopted_budget",
  },
  // South Portland - FY2025 Budget Summary (already downloaded)
  {
    city: "South Portland",
    fiscalYear: 2025,
    url: "https://southportland.gov/DocumentCenter/View/2644/Budget-Summary-PDF",
    type: "budget_summary",
  },
  // Auburn - FY2025 Manager's Proposed Budget (already downloaded)
  {
    city: "Auburn",
    fiscalYear: 2025,
    url: "https://www.auburnmaine.gov/Documents/Departments/Finance/Budget/FY25%20Managers%20Proposed%20Budget.pdf",
    type: "proposed_budget",
  },
  // Biddeford - FY2025 Budget (already downloaded)
  {
    city: "Biddeford",
    fiscalYear: 2025,
    url: "https://www.biddefordmaine.org/DocumentCenter/View/12996/FY25-Approved-Budget",
    type: "adopted_budget",
  },
  // Brunswick - FY2025 Budget (already downloaded)
  {
    city: "Brunswick",
    fiscalYear: 2025,
    url: "https://www.brunswickme.org/DocumentCenter/View/11892/FY2025-Adopted-Budget",
    type: "adopted_budget",
  },
  // Bangor - FY2025 Adopted Budget (corrected URL)
  {
    city: "Bangor",
    fiscalYear: 2025,
    url: "https://www.bangormaine.gov/Archive.aspx?ADID=171",
    type: "adopted_budget",
  },
  // Sanford - FY2025 Annual Financial Report (already downloaded)
  {
    city: "Sanford",
    fiscalYear: 2025,
    url: "https://cms5.revize.com/revize/sanford/City%20of%20Sanford%206.30.24%20Issued%20Financial%20Statement.pdf",
    type: "financial_report",
  },
  // Westbrook - FY2026 Complete Budget (corrected URL)
  {
    city: "Westbrook",
    fiscalYear: 2026,
    url: "http://www.westbrookmaine.gov/DocumentCenter/View/5217",
    type: "proposed_budget",
  },
  // Scarborough - FY2026 Adopted Budget (corrected URL)
  {
    city: "Scarborough",
    fiscalYear: 2026,
    url: "https://resources.finalsite.net/images/v1751896796/scarboroughmaineorg/yi74qmglbewpbbuqlvq0/FY2026BudgetBookAdoptedForWeb.pdf",
    type: "adopted_budget",
  },
  // Gorham - FY2026 Budget (need to find via town website)
  {
    city: "Gorham",
    fiscalYear: 2026,
    url: "https://www.gorham-me.org/sites/g/files/vyhlif4456/f/uploads/fy2026_adopted_municipal_budget.pdf",
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
      redirect: "follow",
    });

    if (!response.ok) {
      console.log(`    Failed: HTTP ${response.status}`);
      return false;
    }

    const contentType = response.headers.get("content-type") || "";
    // Many municipal sites serve PDFs with various content types
    const buffer = Buffer.from(await response.arrayBuffer());

    // Check if it's actually a PDF by looking at magic bytes
    const isPdf = buffer.length > 4 && buffer.slice(0, 4).toString() === "%PDF";

    if (!isPdf && !contentType.includes("pdf") && !contentType.includes("octet-stream")) {
      console.log(`    Not a PDF (content-type: ${contentType})`);
      // Save as HTML to inspect
      writeFileSync(outputPath.replace(".pdf", ".html"), buffer);
      return false;
    }

    writeFileSync(outputPath, buffer);
    console.log(`    Saved: ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
    return true;
  } catch (err) {
    console.log(`    Error: ${err}`);
    return false;
  }
}

async function main() {
  console.log("Downloading Maine city budget PDFs...\n");
  mkdirSync(DATA_DIR, { recursive: true });

  const results: { city: string; fiscalYear: number; file: string; success: boolean }[] = [];

  for (const budget of CITY_BUDGETS) {
    console.log(`${budget.city} FY${budget.fiscalYear}:`);
    const filename = `${budget.city.toLowerCase().replace(/ /g, "_")}_fy${budget.fiscalYear}_budget.pdf`;
    const outputPath = resolve(DATA_DIR, filename);

    if (existsSync(outputPath)) {
      console.log(`  Already exists: ${outputPath}`);
      results.push({ city: budget.city, fiscalYear: budget.fiscalYear, file: filename, success: true });
      continue;
    }

    const success = await downloadPdf(budget.url, outputPath);
    results.push({ city: budget.city, fiscalYear: budget.fiscalYear, file: filename, success });

    // Small delay between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n=== Summary ===");
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\nSuccessful (${successful.length}):`);
  for (const r of successful) {
    console.log(`  ✓ ${r.city} FY${r.fiscalYear} - ${r.file}`);
  }

  if (failed.length > 0) {
    console.log(`\nFailed (${failed.length}):`);
    for (const r of failed) {
      console.log(`  ✗ ${r.city} FY${r.fiscalYear}`);
    }
  }

  // Save manifest
  writeFileSync(resolve(DATA_DIR, "manifest.json"), JSON.stringify(results, null, 2));
  console.log(`\nManifest saved to ${DATA_DIR}/manifest.json`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
