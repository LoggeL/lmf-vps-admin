FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies for node-pty
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install dependencies
RUN npm install --prefix server && npm install --prefix client

# Copy source
COPY server/ ./server/
COPY client/ ./client/

# Build client
RUN npm run build --prefix client

# Production stage
FROM node:22-slim

WORKDIR /app

# Install runtime dependencies including docker-ce-cli
RUN apt-get update && apt-get install -y python3 make g++ git procps curl ca-certificates gnupg && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg && \
    chmod a+r /etc/apt/keyrings/docker.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && apt-get install -y docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# Install docker-compose standalone
RUN curl -SL https://github.com/docker/compose/releases/download/v2.32.4/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose && \
    chmod +x /usr/local/bin/docker-compose

# Copy server with built client
COPY --from=builder /app/server ./server
COPY --from=builder /app/package.json ./

# Install production deps (need to rebuild node-pty)
WORKDIR /app/server
RUN npm install

# Create data directory
RUN mkdir -p /app/server/data

EXPOSE 3002

CMD ["npx", "tsx", "src/index.ts"]
