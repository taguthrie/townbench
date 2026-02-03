/**
 * Fetch all voted appropriations data from NHPFC.org using Puppeteer.
 * Downloads CSV with all municipalities, all years, all voted appropriation categories.
 */

import puppeteer from "puppeteer";
import { mkdirSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(__dirname, "../data/nh");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log("Launching browser...");
  mkdirSync(DATA_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);

    // Set up download handling
    const client = await page.createCDPSession();
    await client.send("Page.setDownloadBehavior", {
      behavior: "allow",
      downloadPath: DATA_DIR,
    });

    console.log("Navigating to NHPFC Data page...");
    await page.goto("https://nhpfc.org/Data", { waitUntil: "networkidle2" });
    await sleep(2000);

    // 1. Select "Voted Appropriations" category (click the checkbox icon)
    console.log("Selecting Voted Appropriations category...");
    const votedAppSelected = await page.evaluate(() => {
      const anchor = document.querySelector('#DataCategoryContainer a[id="Voted Appropriations_anchor"]');
      if (anchor) {
        // Click the checkbox icon within the anchor
        const checkbox = anchor.querySelector(".jstree-checkbox") as HTMLElement;
        if (checkbox) {
          checkbox.click();
          return true;
        }
        // Or just click the anchor itself
        (anchor as HTMLElement).click();
        return true;
      }
      return false;
    });
    console.log("  Voted Appropriations selected:", votedAppSelected);
    await sleep(1000);

    // 2. Select ALL municipalities using jstree API
    console.log("Selecting all municipalities...");
    const muniCount = await page.evaluate(() => {
      // Get the jstree instance for entities
      const $tree = (window as any).jQuery?.("#DataEntityContainer");
      if ($tree && $tree.jstree) {
        // Select all nodes
        $tree.jstree("select_all");
        return $tree.jstree("get_selected").length;
      }
      // Fallback: click each municipality anchor's checkbox
      const anchors = document.querySelectorAll("#DataEntityContainer .jstree-anchor");
      anchors.forEach((a) => {
        const cb = a.querySelector(".jstree-checkbox") as HTMLElement;
        if (cb) cb.click();
      });
      return anchors.length;
    });
    console.log(`  Selected ${muniCount} municipalities`);
    await sleep(1000);

    // Take screenshot before download
    await page.screenshot({ path: resolve(DATA_DIR, "nhpfc-before-download.png"), fullPage: true });

    // 3. Click download button
    console.log("Clicking download button...");
    await page.click("#DownloadDataButton");

    // Wait for download to complete
    console.log("Waiting for download...");
    await sleep(15000);

    // Check what files we have
    const files = readdirSync(DATA_DIR);
    console.log("Files in data directory:", files);

    // Look for CSV file
    const csvFile = files.find((f) => f.endsWith(".csv"));
    if (csvFile) {
      console.log(`\nDownloaded: ${csvFile}`);
    } else {
      console.log("No CSV file found yet. Taking final screenshot...");
      await page.screenshot({ path: resolve(DATA_DIR, "nhpfc-after-download.png"), fullPage: true });
    }

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
