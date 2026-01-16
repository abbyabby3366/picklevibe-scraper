# PickleVibe Scraper - Docker Setup

This project is a Node.js Express server that scrapes booking data from Courtsite Business using Puppeteer.

## 🐳 Docker Quick Start

### Prerequisites
- Docker installed on your system
- Docker Compose installed

### Running with Docker Compose

1. **Build and start the container:**
   ```bash
   docker-compose up -d
   ```

2. **View logs:**
   ```bash
   docker-compose logs -f picklevibe-scraper
   ```

3. **Stop the container:**
   ```bash
   docker-compose down
   ```

### Available Endpoints

Once running, the server will be available at `http://localhost:3048`:

- **Health Check:** `GET http://localhost:3048/health`
- **Get Status:** `GET http://localhost:3048/api/status`
- **Trigger Scrape:** `POST http://localhost:3048/api/scrape`
- **Get Data:** `GET http://localhost:3048/api/data`
- **Get Statistics:** `GET http://localhost:3048/api/stats`
- **Dashboard:** `http://localhost:3048/` (serves the public dashboard)

### Configuration

The application uses environment variables defined in `.env`:
- `PORT`: Server port (default: 3048)

### Automated Scheduling

The scraper automatically runs daily at **11:50 PM Malaysia Time (GMT+8)** via a cron job.

### Data Persistence

- Scraped data is saved to `all_bookings.json`
- The docker-compose setup mounts this file for persistence across container restarts
- Data is also sent to Google Sheets via the configured Apps Script URL

## 📦 Manual Docker Commands

### Build the image:
```bash
docker build -t picklevibe-scraper .
```

### Run the container:
```bash
docker run -d \
  --name picklevibe-scraper \
  -p 3048:3048 \
  --cap-add=SYS_ADMIN \
  --shm-size=2gb \
  picklevibe-scraper
```

## 🔧 Development

For local development without Docker:
```bash
npm install
npm run dev
```

## 🛠️ Troubleshooting

### Puppeteer issues in Docker
- The Dockerfile installs Chrome and all necessary dependencies
- The `--no-sandbox` and `--disable-setuid-sandbox` flags are required for Docker
- `SYS_ADMIN` capability is needed for Chrome in containerized environments
- Shared memory size (`shm_size: 2gb`) prevents Chrome crashes

### Viewing container logs
```bash
docker-compose logs -f
```

### Accessing the container shell
```bash
docker-compose exec picklevibe-scraper /bin/bash
```

### Rebuilding after changes
```bash
docker-compose up --build -d
```
