/**
 * Google Apps Script to receive booking data and write to Google Sheet.
 * Deployment: Deploy as Web App -> Execute as Me -> Access: Anyone
 */

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.openById(
      "1SSgr-xHeVyeTdVX9j283H1Z7eTgmjM0W1BZgb2CN_ao"
    );

    if (!Array.isArray(data)) {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "error", message: "Data must be an array" })
      ).setMimeType(ContentService.MimeType.JSON);
    }

    // Group data by target sheet name
    const groupedData = {
      Kepong: [],
      Puchong: [],
      "Seri Kembangan": [],
    };

    data.forEach((item) => {
      const org = item.organization || "";
      let targetGroup = "Kepong"; // Default fallback

      if (org.includes("Seri Kembangan")) {
        targetGroup = "Seri Kembangan";
      } else if (org.includes("Kepong")) {
        targetGroup = "Kepong";
      } else if (org.includes("Puchong") || org.includes("Kinrara")) {
        targetGroup = "Puchong";
      }

      const row = [
        org,
        item.bookingId || "",
        item.customer?.name || item.customerName || "",
        item.customer?.phone || item.customerPhone || "",
        item.customer?.email || item.customerEmail || "",
        item.startDateTime || "",
        item.duration || "",
        item.resources || "",
        item.price || "",
        item.source || "",
        item.status || "",
        new Date(),
      ];

      groupedData[targetGroup].push(row);
    });

    // Write grouped data to respective sheets
    let totalAdded = 0;
    for (const [sheetName, rows] of Object.entries(groupedData)) {
      if (rows.length > 0) {
        let sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          sheet = ss.insertSheet(sheetName);
          // Add headers to the new sheet
          const headers = [
            "Organization",
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
            "Current Time",
          ];
          sheet.appendRow(headers);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        }

        const startRow = sheet.getLastRow() + 1;
        sheet
          .getRange(startRow, 1, rows.length, rows[0].length)
          .setValues(rows);
        totalAdded += rows.length;
      }
    }

    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", count: totalAdded })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "error", message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
