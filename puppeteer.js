/**
 * Puppeteer scraper for business.courtsite.my/login
 * This script navigates to the Courtsite business login page and takes basic actions.
 * Run with: node scrape.js
 */

const puppeteer = require("puppeteer");

async function scrapeCourtSite() {
  // --- Send Data to Google Sheets via Apps Script ---
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbzqmU7DLEE55herBKAPuQisW1C2E-6_vYCFp2fN09q0uydlz7_8Z6CHV_3XILmC0tM9/exec";

  try {
    // Launch browser
    const browser = await puppeteer.launch({
      headless: false, // Set to true for headless mode
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",
        "--ignore-certificate-errors-spki-list",
        "--disable-web-security",
        "--allow-running-insecure-content",
      ],
      ignoreHTTPSErrors: true,
    });

    // Create a new page
    const page = await browser.newPage();

    // Set user agent to avoid detection
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    // Navigate to the target URL
    console.log("Navigating to https://business.courtsite.my/login...");
    await page.goto("https://business.courtsite.my/login", {
      waitUntil: "networkidle2",
    });

    // Wait a bit for dynamic content to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the page title
    const title = await page.title();
    console.log("Page title:", title);

    // Get the current URL (in case of redirects)
    const currentUrl = page.url();
    console.log("Current URL:", currentUrl);

    // Login automation
    console.log("Attempting to log in...");
    try {
      // Wait for and fill email field
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await page.type('input[name="email"]', "desmondgiam@gmail.com");
      console.log("Email entered");

      // Wait for and fill password field
      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await page.type('input[name="password"]', "Qwerty123$");
      console.log("Password entered");

      // Wait a moment before clicking login
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Click the login button
      await page.click('button[type="submit"]');
      console.log("Login button clicked");

      // Wait for navigation or page change after login
      await page
        .waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 })
        .catch(() => {
          // If navigation doesn't happen, just wait a bit
          console.log("No navigation detected, waiting for page update...");
          return new Promise((resolve) => setTimeout(resolve, 3000));
        });

      // 2. Define the organizations to scrape
      const organizations = [
        {
          name: "The Pickle Vibe @ Kepong",
          url: "https://business.courtsite.my/organisation/cm2q9r2wu3n5j08c2l3dicteo/masa/bookings",
        },
        {
          name: "The Pickle Vibe @ Kinrara, Puchong",
          url: "https://business.courtsite.my/organisation/cm9wpfyve06bn617sluk4ywcq/masa/bookings",
        },
        {
          name: "The Pickle Vibe @ Seri Kembangan",
          url: "https://business.courtsite.my/organisation/cm6ojban20hgg076asuu9j6gh/masa/bookings",
        },
      ];

      let allBookingsCombined = [];

      for (const org of organizations) {
        console.log(`\n--- Processing: ${org.name} ---`);
        console.log(`Navigating to ${org.url}...`);

        await page.goto(org.url, { waitUntil: "networkidle2" });

        // Optional: Refresh/Wait to ensure table loads
        await new Promise((resolve) => setTimeout(resolve, 3000));

        let hasNextPage = true;
        let orgCount = 0;

        while (hasNextPage) {
          // Extract data from the current page
          const pageData = await page.evaluate((orgName) => {
            const table = document.querySelector("table.w-full.min-w-min");
            if (!table) return [];

            const rows = Array.from(table.querySelectorAll("tbody tr"));
            return rows
              .map((row) => {
                const cells = row.querySelectorAll("td");
                if (cells.length < 8) return null;

                const customerDiv = cells[1].querySelector(".flex.flex-col");
                const spans = customerDiv
                  ? Array.from(customerDiv.querySelectorAll("span"))
                  : [];

                return {
                  organization: orgName,
                  bookingId: cells[0].innerText.trim(),
                  customer: {
                    name: spans[0] ? spans[0].innerText.trim() : "",
                    phone: spans[1] ? spans[1].innerText.trim() : "",
                    email: spans[2] ? spans[2].innerText.trim() : "",
                  },
                  startDateTime: cells[2].innerText.trim(),
                  duration: cells[3].innerText.trim(),
                  resources: cells[4].innerText.trim(),
                  price: cells[5].innerText.trim(),
                  source: cells[6].innerText.trim(),
                  status: cells[7].innerText.trim(),
                };
              })
              .filter((item) => item !== null);
          }, org.name);

          allBookingsCombined.push(...pageData);
          orgCount += pageData.length;

          console.log(
            `Scraped page... Total for ${org.name} so far: ${orgCount}`
          );

          // Check for next button and click it
          hasNextPage = await page.evaluate(async () => {
            const nextBtn = Array.from(
              document.querySelectorAll("button")
            ).find((btn) => btn.innerText === ">");
            if (
              nextBtn &&
              !nextBtn.disabled &&
              !nextBtn.hasAttribute("disabled")
            ) {
              nextBtn.click();
              return true;
            }
            return false;
          });

          if (hasNextPage) {
            // Wait for the table to refresh
            await new Promise((resolve) => setTimeout(resolve, 8000));
            // Wait for the network to be idle
            await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});
          }
        }
        console.log(`✅ Finished ${org.name}: Found ${orgCount} bookings.`);
      }

      console.log(
        `\n✅ ALL SCRAPING COMPLETE! Extracted ${allBookingsCombined.length} total bookings.`
      );

      if (APPS_SCRIPT_URL === "YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE") {
        console.warn(
          "⚠️ APPS_SCRIPT_URL is still a placeholder. Saving to local file instead."
        );
        const fs = require("fs");
        fs.writeFileSync(
          "all_bookings.json",
          JSON.stringify(allBookingsCombined, null, 2)
        );
        console.log("Combined results saved to all_bookings.json");
      } else {
        console.log("Sending data to Google Sheets...");
        try {
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
          const response = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(allBookingsCombined),
          });

          const result = await response.json();
          if (result.status === "success") {
            console.log(
              `✅ Success! Added ${result.count} rows to Google Sheet.`
            );
          } else {
            console.error("❌ Apps Script Error:", result.message);
          }
        } catch (postError) {
          console.error(
            "❌ Failed to send data to Apps Script:",
            postError.message
          );
          // Fallback to local save
          const fs = require("fs");
          fs.writeFileSync(
            "all_bookings.json",
            JSON.stringify(allBookingsCombined, null, 2)
          );
          console.log("Data saved locally due to upload failure.");
        }
      }
    } catch (loginError) {
      console.log("Automation failed:", loginError.message);
    }

    // Keep the browser open for manual inspection
    console.log("Process complete. Press Ctrl+C to exit.");
    await browser.close();
  } catch (error) {
    console.error("Error occurred:", error.message);
    process.exit(1);
  }
}

// Export the function for use in the Express server
module.exports = { scrapeCourtSite };

// Run the scraper if this file is executed directly
if (require.main === module) {
  scrapeCourtSite();
}
