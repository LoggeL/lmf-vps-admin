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

# Install runtime dependencies
RUN apt-get update && apt-get install -y python3 make g++ git docker.io procps && rm -rf /var/lib/apt/lists/*

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
