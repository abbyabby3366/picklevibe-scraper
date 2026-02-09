# Use official Node.js LTS image - Puppeteer will download its own Chromium
FROM node:20-slim

# Install minimal system dependencies for Puppeteer (even with bundled Chromium)
RUN apt-get update && apt-get install -y \
    libgbm1 \
    libxss1 \
    libasound2 \
    libgtk-3-0 \
    libx11-xcb1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create directory for data persistence
RUN mkdir -p /app/data

# Expose port (Cloud Run will override this)
EXPOSE 8080

# Start the application
CMD ["npm", "start"]
