/**
 * Courtsite Bookings Scraper (Console Script)
 *
 * Instructions:
 * 1. Open Chrome and navigate to the Courtsite Bookings page.
 * 2. Press F12 or Right Click -> Inspect to open Developer Tools.
 * 3. Go to the "Console" tab.
 * 4. Paste the code below and press Enter.
 * 5. The script will automatically navigate through pages and download a CSV file.
 */

(async function () {
  let allData = [];
  const DELAY_BETWEEN_PAGES = 8000; // 10 seconds delay to allow table to load

  /**
   * Extracts data from the current page's table
   */
  async function scrapePage() {
    const table = document.querySelector("table.w-full.min-w-min");
    if (!table) {
      console.error("Table not found! Make sure you are on the correct page.");
      return;
    }

    const rows = Array.from(table.querySelectorAll("tbody tr"));
    console.log(`Found ${rows.length} rows on this page.`);

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length < 8) return;

      const customerDiv = cells[1].querySelector(".flex.flex-col");
      const spans = customerDiv
        ? Array.from(customerDiv.querySelectorAll("span"))
        : [];

      const booking = {
        bookingId: cells[0].innerText.trim(),
        customerName: spans[0] ? spans[0].innerText.trim() : "",
        customerPhone: spans[1] ? spans[1].innerText.trim() : "",
        customerEmail: spans[2] ? spans[2].innerText.trim() : "",
        startDateTime: cells[2].innerText.trim(),
        duration: cells[3].innerText.trim(),
        resources: cells[4].innerText.trim(),
        price: cells[5].innerText.trim(),
        source: cells[6].innerText.trim(),
        status: cells[7].innerText.trim(),
      };
      allData.push(booking);
    });
  }

  /**
   * Finds the next pagination button (">")
   */
  function getNextButton() {
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.find(
      (btn) =>
        btn.innerText === ">" ||
        (btn.textContent.trim() === ">" && btn.classList.contains("w-8"))
    );
  }

  /**
   * Converts JSON data to CSV and triggers a download
   */
  function downloadCSV(data) {
    if (!data || !data.length) {
      console.warn("No data to download.");
      return;
    }

    const headers = [
      "Booking ID",
      "Customer Name",
      "Phone",
      "Email",
      "Start Date & Time",
      "Duration",
      "Resources",
      "Price",
      "Source",
      "Status",
    ];

    // Helper to escape CSV values
    const escapeCSV = (val) => {
      if (val === null || val === undefined) return "";
      let result = val.toString().replace(/"/g, '""'); // Escape double quotes
      return `"${result}"`;
    };

    const csvRows = [
      headers.join(","), // Header row
      ...data.map((b) =>
        [
          escapeCSV(b.bookingId),
          escapeCSV(b.customerName),
          escapeCSV(b.customerPhone),
          escapeCSV(b.customerEmail),
          escapeCSV(b.startDateTime),
          escapeCSV(b.duration),
          escapeCSV(b.resources),
          escapeCSV(b.price),
          escapeCSV(b.source),
          escapeCSV(b.status),
        ].join(",")
      ),
    ];

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    // Use organization name or default for filename
    const orgSelector = document.querySelector(".typography-h4"); // Often contains org name
    const fileName =
      (orgSelector
        ? orgSelector.innerText.trim().replace(/\s+/g, "_")
        : "SK courtsite_bookings") + ".csv";

    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log(
      `%cDownload triggered: ${fileName}`,
      "color: green; font-weight: bold;"
    );
  }

  /**
   * Main execution loop
   */
  async function run() {
    console.log(
      "%c--- Courtsite CSV Scraper Started ---",
      "color: blue; font-weight: bold;"
    );

    while (true) {
      await scrapePage();
      console.log(`Total records accumulated: ${allData.length}`);

      const nextBtn = getNextButton();

      if (nextBtn && !nextBtn.disabled && !nextBtn.hasAttribute("disabled")) {
        console.log("Navigating to next page...");
        nextBtn.click();
        await new Promise((resolve) =>
          setTimeout(resolve, DELAY_BETWEEN_PAGES)
        );
      } else {
        console.log("Reached the last page or next button is disabled.");
        break;
      }
    }

    console.log(
      "%c--- Scraping Complete! ---",
      "color: green; font-weight: bold;"
    );
    console.log("Final Data Size:", allData.length);

    // Trigger the CSV download
    downloadCSV(allData);
  }

  run();
})();
