FROM node:18-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-glib-1-2 \
    libxcomposite1 \
    libxrandr2 \
    libxdamage1 \
    libxkbcommon0 \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install

# Copy app files
COPY . .

CMD ["node", "index.js"]
