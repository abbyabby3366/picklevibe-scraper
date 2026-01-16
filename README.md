# PickleVibe Scraper API

An Express.js API server for scraping and managing Pickle Vibe (courtsite) booking data.

## Features

- 🚀 RESTful API endpoints for scraping operations
- 📊 Booking data retrieval and statistics
- 🔒 Security headers and CORS support
- 📝 Comprehensive logging
- 🏥 Health monitoring endpoints

## Installation

```bash
npm install
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Direct Scraping (without server)

```bash
npm run scrape
```

### Web Dashboard

Once the server is running, open your browser and navigate to:

```
http://localhost:3000
```

The web interface provides:

- One-click scraping trigger
- Real-time status monitoring
- Booking data visualization
- Statistics dashboard

## API Endpoints

### Health Check

- `GET /health` - Server health status

### Scraping Operations

- `GET /api/status` - Get current scraping status
- `POST /api/scrape` - Trigger a new scraping operation

### Data Retrieval

- `GET /api/data` - Get all scraped booking data
- `GET /api/stats` - Get booking statistics and analytics

## API Response Examples

### Health Check

```json
{
  "status": "healthy",
  "timestamp": "2024-01-16T10:30:00.000Z",
  "uptime": 3600
}
```

### Booking Statistics

```json
{
  "success": true,
  "stats": {
    "totalBookings": 150,
    "organizations": {
      "The Pickle Vibe @ Kepong": 45,
      "The Pickle Vibe @ Kinrara, Puchong": 67,
      "The Pickle Vibe @ Seri Kembangan": 38
    },
    "statusCounts": {
      "Confirmed": 120,
      "Pending": 20,
      "Cancelled": 10
    },
    "sourceCounts": {
      "Online": 95,
      "Phone": 35,
      "Walk-in": 20
    },
    "totalRevenue": 15750.5
  },
  "lastUpdated": "2024-01-16T10:25:00.000Z"
}
```

## Data Structure

Each booking record contains:

- `organization`: Location name
- `bookingId`: Unique booking identifier
- `customer`: Object with name, phone, email
- `startDateTime`: Booking start time
- `duration`: Booking duration
- `resources`: Court/resources booked
- `price`: Booking price (RM)
- `source`: How the booking was made
- `status`: Booking status

## Environment Variables

- `PORT`: Server port (default: 3000)

## Security

The server includes:

- Helmet.js for security headers
- CORS support for cross-origin requests
- Input validation and sanitization

## Development

The server uses:

- Express.js for the web framework
- Puppeteer for web scraping
- Morgan for HTTP request logging
- CORS for cross-origin support
- Helmet for security headers

## Error Handling

The API includes comprehensive error handling with appropriate HTTP status codes and descriptive error messages.

## License

ISC
