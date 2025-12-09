FROM node:18-alpine
WORKDIR /app

# Copy monorepo configuration and packages for workspace dependencies
COPY package*.json ./
COPY turbo.json ./
COPY packages/ ./packages/

# Copy sidecar source
COPY apps/sidecar/ ./apps/sidecar/

# Install dependencies (will resolve workspace packages)
RUN npm install

# Build the packages that sidecar depends on
RUN npx turbo run build --filter @repo/types
RUN npx turbo run build --filter @repo/command-security

# Build the sidecar
WORKDIR /app/apps/sidecar
RUN npm run build

EXPOSE 8080
# Force rebuild marker: 2025-12-07
CMD ["node", "dist/server.js"]
