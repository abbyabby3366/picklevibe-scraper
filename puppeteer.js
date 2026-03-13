require("dotenv").config();
const axios = require("axios");
const puppeteer = require("puppeteer");

async function syncToJomRewards(bookings) {
    if (!bookings || bookings.length === 0) {
        console.log("No bookings to sync to JomRewards");
        return;
    }

    if (!process.env.JOMREWARDS_API_URL || !process.env.JOMREWARDS_API_KEY) {
        console.warn("Missing JOMREWARDS_API_URL or JOMREWARDS_API_KEY in .env – skipping JomRewards sync");
        return;
    }

    const createUsers = process.env.JOMREWARDS_CREATE_USERS !== "false";
    const pointsPerRm = parseFloat(process.env.JOMREWARDS_POINTS_PER_RM ?? "1") || 0;
    const sendWelcomeMessage = process.env.JOMREWARDS_SEND_WELCOME_MESSAGE !== "false";
    const sendPointsMessage = process.env.JOMREWARDS_SEND_POINTS_MESSAGE === "true";

    if (!createUsers) {
        console.log("JOMREWARDS_CREATE_USERS=false – skipping JomRewards sync");
        return;
    }

    console.log(`\nStarting JomRewards sync for ${bookings.length} bookings...`);
    console.log(`Points per RM      : ${pointsPerRm === 0 ? "disabled" : pointsPerRm}`);
    console.log(`Send welcome msg   : ${sendWelcomeMessage}`);
    console.log(`Send points msg    : ${sendPointsMessage && pointsPerRm > 0}`);

    function parsePrice(priceStr) {
        if (!priceStr) return 0;
        const cleaned = String(priceStr).replace(/[^\d.]/g, "");
        return parseFloat(cleaned) || 0;
    }


    const uniqueCustomers = {};

    for (const booking of bookings) {
        const phone = booking.customer?.phone;
        if (!phone || !phone.trim()) continue;

        const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");
        let formattedPhone;

        if (normalizedPhone.startsWith("+")) formattedPhone = normalizedPhone; else if (normalizedPhone.startsWith("60")) formattedPhone = `+${normalizedPhone}`; else if (normalizedPhone.startsWith("0")) formattedPhone = `+6${normalizedPhone}`; else formattedPhone = `+60${normalizedPhone}`;

        if (formattedPhone.length < 10 || formattedPhone.length > 16) {
            console.warn(`Skipping invalid phone: ${phone}`);
            continue;
        }

        const phoneForApi = formattedPhone.replace(/^\+/, "");


        const priceRm = parsePrice(booking.price);
        const bookingPoints = pointsPerRm > 0 ? Math.floor(priceRm * pointsPerRm) : 0;

        if (!uniqueCustomers[formattedPhone]) {
            const nameParts = (booking.customer?.name || "").trim().split(" ");

            uniqueCustomers[formattedPhone] = {
                phone_number: phoneForApi,
                first_name: nameParts[0] || "",
                last_name: nameParts.slice(1).join(" ") || "",
                entry_method: "api",
                subscribe_message: true,
                send_welcome_message: sendWelcomeMessage,
                send_points_credit_message: sendPointsMessage && pointsPerRm > 0,
                add_points: bookingPoints,
                total_spent: priceRm,
                _bookingCount: 1,
            };

            if (booking.customer?.email?.trim()) {
                uniqueCustomers[formattedPhone].email = booking.customer.email.trim();
            }
        } else {

            uniqueCustomers[formattedPhone].add_points += bookingPoints;
            uniqueCustomers[formattedPhone].total_spent += priceRm;
            uniqueCustomers[formattedPhone]._bookingCount++;
        }
    }

    const usersArray = Object.values(uniqueCustomers).map((u) => {
        const {_bookingCount, ...rest} = u;

        console.log(`   ${rest.phone_number} — ${_bookingCount} booking(s), ` + `RM ${rest.total_spent.toFixed(2)}, ${rest.add_points} point(s)`);

        if (pointsPerRm === 0) {

            delete rest.add_points;
            delete rest.send_points_credit_message;
        }

        return rest;
    });

    console.log(`\nUnique customers to sync: ${usersArray.length}`);


    const BATCH_SIZE = 100;
    let totalCreated = 0, totalUpdated = 0, totalFailed = 0;

    for (let i = 0; i < usersArray.length; i += BATCH_SIZE) {
        const batch = usersArray.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const totalBatches = Math.ceil(usersArray.length / BATCH_SIZE);
        console.log(`\nBatch ${batchNum}/${totalBatches}: ${batch.length} users...`);

        try {
            const res = await axios.post(`${process.env.JOMREWARDS_API_URL}/api/public/create-user/`, batch, {
                headers: {
                    "Content-Type": "application/json", "X-API-Key": process.env.JOMREWARDS_API_KEY,
                }, timeout: 120000,
            });

            const {created = 0, updated = 0, failed = 0} = res.data.summary || {};
            console.log(`Created: ${created} | Updated: ${updated} | Failed: ${failed}`);
            totalCreated += created;
            totalUpdated += updated;
            totalFailed += failed;
        } catch (err) {
            console.error(`Batch ${batchNum} failed:`, err.response?.data || err.message);
            totalFailed += batch.length;
        }

        if (i + BATCH_SIZE < usersArray.length) {
            await new Promise((r) => setTimeout(r, 1000));
        }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`JOMREWARDS SYNC COMPLETE`);
    console.log(`Created : ${totalCreated}`);
    console.log(`Updated : ${totalUpdated}`);
    console.log(`Failed  : ${totalFailed}`);
    console.log(`${"=".repeat(50)}\n`);
}

async function scrapeCourtSite() {
  const APPS_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycby3_628s_ErKt_cXugkYqJiNJegSfiOGD4xywtT_JDpCz1lRm_4n_-QlFZzBgd7ULId/exec";

  try {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: require("puppeteer").executablePath(),
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--window-size=1280,800",],
        ignoreHTTPSErrors: true,
        defaultViewport: null,
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );

    console.log("Navigating to https://business.courtsite.my/login...");
    await page.goto("https://business.courtsite.my/login", {
      waitUntil: "networkidle2",
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const title = await page.title();
    console.log("Page title:", title);

    const currentUrl = page.url();
    console.log("Current URL:", currentUrl);

    console.log("Attempting to log in...");
    try {
      await page.waitForSelector('input[name="email"]', { timeout: 10000 });
      await page.type('input[name="email"]', "desmondgiam@gmail.com");
      console.log("Email entered");

      await page.waitForSelector('input[name="password"]', { timeout: 10000 });
      await page.type('input[name="password"]', "Qwerty123$");
      console.log("Password entered");

      await new Promise((resolve) => setTimeout(resolve, 500));

      await page.click('button[type="submit"]');
      console.log("Login button clicked");

      await page
        .waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 })
        .catch(() => {
          console.log("No navigation detected, waiting for page update...");
          return new Promise((resolve) => setTimeout(resolve, 3000));
        });


        const organizations = [
        {
            id: 1,
          name: "The Pickle Vibe @ Kepong",
          url: "https://business.courtsite.my/organisation/cm2q9r2wu3n5j08c2l3dicteo/masa/bookings",
        },
        {
            id: 2,
          name: "The Pickle Vibe @ Kinrara, Puchong",
          url: "https://business.courtsite.my/organisation/cm9wpfyve06bn617sluk4ywcq/masa/bookings",
        },
        {
            id: 3,
          name: "The Pickle Vibe @ Seri Kembangan",
          url: "https://business.courtsite.my/organisation/cm6ojban20hgg076asuu9j6gh/masa/bookings",
        },
      ];


        const jomRewardsOrgIds = process.env.ORGANIZATION_ID ? process.env.ORGANIZATION_ID.split(",").map((s) => parseInt(s.trim(), 10)) : [];

      let allBookingsCombined = [];

      for (const org of organizations) {
        console.log(`\n--- Processing: ${org.name} ---`);
        console.log(`Navigating to ${org.url}...`);

        await page.goto(org.url, { waitUntil: "networkidle2" });
        await new Promise((resolve) => setTimeout(resolve, 3000));

        let hasNextPage = true;
        let orgCount = 0;
          let orgBookings = [];

        while (hasNextPage) {
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

            orgBookings.push(...pageData);
          allBookingsCombined.push(...pageData);
          orgCount += pageData.length;

          console.log(
            `Scraped page... Total for ${org.name} so far: ${orgCount}`
          );

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
            await new Promise((resolve) => setTimeout(resolve, 8000));
            await page.waitForNetworkIdle({ timeout: 5000 }).catch(() => {});
          }
        }

          console.log(`Finished ${org.name}: Found ${orgCount} bookings.`);


          if (jomRewardsOrgIds.includes(org.id)) {
              console.log(`\n[JomRewards] Syncing ${org.name} (id=${org.id})...`);
              await syncToJomRewards(orgBookings);
          } else {
              console.log(`[JomRewards] Skipping ${org.name} (not in ORGANIZATION_ID)`);
          }
      }

        console.log(`\nALL SCRAPING COMPLETE! Extracted ${allBookingsCombined.length} total bookings.`);

        console.log("Sending data to Google Sheets...");
        try {
            const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));
            const response = await fetch(APPS_SCRIPT_URL, {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(allBookingsCombined),
            });

            const result = await response.json();
            if (result.status === "success") {
                console.log(`Google Sheets: Added ${result.count} rows.`);
            } else {
                console.error("❌ Apps Script Error:", result.message);
            }
        } catch (postError) {
            console.error("❌ Failed to send to Google Sheets:", postError.message);
        }

        await browser.close();

        return allBookingsCombined;
    } catch (loginError) {
      console.log("Automation failed:", loginError.message);
        await browser.close();
        return [];
    }
  } catch (error) {
    console.error("Error occurred:", error.message);
    process.exit(1);
  }
}

module.exports = { scrapeCourtSite };

if (require.main === module) {
  scrapeCourtSite();
}