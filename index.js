require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs").promises;
const cron = require("node-cron");

// Import the scraper function from puppeteer.js
const { scrapeCourtSite } = require("./puppeteer.js");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(cors()); // Enable CORS for all routes
app.use(morgan("combined")); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// Store scraping status and results
let scrapingStatus = {
  isRunning: false,
  lastRun: null,
  lastResult: null,
  error: null,
  nextScheduledRun: null,
  schedulerEnabled: true,
};

// Function to calculate next scheduled run time (11:50 PM Malaysia Time = GMT+8)
function getNextScheduledRun() {
  const now = new Date();
  const malaysiaOffset = 8 * 60; // Malaysia is GMT+8

  // Get current time in Malaysia
  const malaysiaTime = new Date(
    now.getTime() + (now.getTimezoneOffset() + malaysiaOffset) * 60000
  );

  // Set to 11:50 PM today
  let nextRun = new Date(malaysiaTime);
  nextRun.setHours(23, 50, 0, 0);

  // If we've already passed 11:50 PM today, schedule for tomorrow
  if (malaysiaTime >= nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  // Convert back to local time
  return new Date(
    nextRun.getTime() - (now.getTimezoneOffset() + malaysiaOffset) * 60000
  );
}

// Update next scheduled run time
scrapingStatus.nextScheduledRun = getNextScheduledRun().toISOString();

// Function to run the scraper (used by both manual trigger and scheduled runs)
async function runScraper(source = "manual") {
  if (scrapingStatus.isRunning) {
    console.log("⏭️ Skipping scrape - already in progress");
    return;
  }

  console.log(`🚀 Starting scrape (triggered by: ${source})`);
  scrapingStatus.isRunning = true;
  scrapingStatus.error = null;

  try {
    await scrapeCourtSite();
    scrapingStatus.lastRun = new Date().toISOString();
    scrapingStatus.isRunning = false;
    scrapingStatus.nextScheduledRun = getNextScheduledRun().toISOString();
    console.log("✅ Scraping completed successfully");
  } catch (error) {
    scrapingStatus.isRunning = false;
    scrapingStatus.error = error.message;
    scrapingStatus.nextScheduledRun = getNextScheduledRun().toISOString();
    console.error("❌ Scraping error:", error);
  }
}

// Set up cron job to run at 11:50 PM Malaysia Time (GMT+8)
// Cron runs in the server's local timezone, so we need to calculate the equivalent time
const setupScheduler = () => {
  // This cron expression runs at 11:50 PM every day in Malaysia timezone
  // Format: '50 23 * * *' means at 23:50 (11:50 PM) every day
  // We'll use timezone option to ensure it runs at Malaysia time
  const cronExpression = "50 23 * * *";

  const scheduledTask = cron.schedule(
    cronExpression,
    () => {
      console.log("⏰ Scheduled scrape triggered at 11:50 PM Malaysia Time");
      runScraper("scheduled");
    },
    {
      scheduled: true,
      timezone: "Asia/Kuala_Lumpur",
    }
  );

  console.log(
    "⏰ Scheduler initialized - scraping will run daily at 11:50 PM Malaysia Time"
  );
  return scheduledTask;
};

// Start the scheduler
const scheduledTask = setupScheduler();

// Routes

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Get scraping status
app.get("/api/status", (req, res) => {
  res.json({
    ...scrapingStatus,
    timestamp: new Date().toISOString(),
  });
});

// Trigger scraping operation
app.post("/api/scrape", async (req, res) => {
  if (scrapingStatus.isRunning) {
    return res.status(409).json({
      error: "Scraping is already in progress",
      status: scrapingStatus,
    });
  }

  // Run the scraper in the background
  runScraper("manual");

  res.json({
    message: "Scraping started successfully",
    status: "started",
    nextScheduledRun: scrapingStatus.nextScheduledRun,
  });
});

// Get scraped data
app.get("/api/data", async (req, res) => {
  try {
    // Try to read the local JSON file if it exists
    const dataPath = path.join(__dirname, "all_bookings.json");

    try {
      const data = await fs.readFile(dataPath, "utf8");
      const bookings = JSON.parse(data);

      res.json({
        success: true,
        count: bookings.length,
        data: bookings,
        timestamp: scrapingStatus.lastRun,
      });
    } catch (fileError) {
      // If file doesn't exist or can't be read
      res.status(404).json({
        error: "No scraped data available",
        message:
          "Run a scraping operation first or check if data was saved to Google Sheets",
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to retrieve data",
      message: error.message,
    });
  }
});

// Get booking statistics
app.get("/api/stats", async (req, res) => {
  try {
    const dataPath = path.join(__dirname, "all_bookings.json");

    try {
      const data = await fs.readFile(dataPath, "utf8");
      const bookings = JSON.parse(data);

      // Calculate statistics
      const stats = {
        totalBookings: bookings.length,
        organizations: {},
        statusCounts: {},
        sourceCounts: {},
        totalRevenue: 0,
      };

      bookings.forEach((booking) => {
        // Organization stats
        const org = booking.organization || "Unknown";
        stats.organizations[org] = (stats.organizations[org] || 0) + 1;

        // Status stats
        stats.statusCounts[booking.status] =
          (stats.statusCounts[booking.status] || 0) + 1;

        // Source stats
        stats.sourceCounts[booking.source] =
          (stats.sourceCounts[booking.source] || 0) + 1;

        // Revenue calculation (remove RM prefix and convert to number)
        const priceStr = booking.price.replace("RM", "").trim();
        const price = parseFloat(priceStr) || 0;
        stats.totalRevenue += price;
      });

      res.json({
        success: true,
        stats,
        lastUpdated: scrapingStatus.lastRun,
      });
    } catch (fileError) {
      res.status(404).json({
        error: "No data available for statistics",
        message: "Run a scraping operation first",
      });
    }
  } catch (error) {
    res.status(500).json({
      error: "Failed to calculate statistics",
      message: error.message,
    });
  }
});

// Serve static files (for any frontend if added later)
app.use(express.static(path.join(__dirname, "public")));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      "GET /health",
      "GET /api/status",
      "POST /api/scrape",
      "GET /api/data",
      "GET /api/stats",
    ],
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error",
    message:
      process.env.NODE_ENV === "development"
        ? error.message
        : "Something went wrong",
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 PickleVibe Scraper API Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔍 API Status: http://localhost:${PORT}/api/status`);
  console.log(`📋 API Docs:`);
  console.log(`   POST /api/scrape - Trigger scraping operation`);
  console.log(`   GET  /api/data   - Get scraped booking data`);
  console.log(`   GET  /api/stats  - Get booking statistics`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down server gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down server gracefully...");
  process.exit(0);
});

module.exports = app;
