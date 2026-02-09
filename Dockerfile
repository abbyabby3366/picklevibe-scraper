# Use official Node.js LTS image - Puppeteer will download its own Chromium
FROM node:20-slim

# Install system dependencies required for Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
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
