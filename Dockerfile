FROM node:18-slim

# Install dependencies termasuk Chromium
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxrandr2 \
    libxss1 \
    xdg-utils \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Set Puppeteer untuk skip download Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY . /app
RUN npm install

CMD ["npm", "start"]
