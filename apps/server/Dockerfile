# Backend Server Dockerfile - Optimized for Turborepo monorepo
# Cache bust: 2025-12-10-0532
FROM node:22-alpine AS base

# Builder stage - prunes monorepo and installs dependencies
FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo@^2

# Copy entire monorepo for pruning
COPY . .

# CRITICAL: Remove all .env files BEFORE pruning - prevents dev config from entering build
RUN find . -name ".env*" -type f ! -name ".env.example" ! -name ".env.template" -delete 2>/dev/null || true

# Generate a partial monorepo with pruned lockfile for server workspace
RUN turbo prune server --docker

# Installer stage - installs dependencies from pruned workspace
FROM base AS installer  
RUN apk update && apk add --no-cache libc6-compat python3 make g++ bash
WORKDIR /app

# Copy source files first (needed for Prisma schema during postinstall)
COPY --from=builder /app/out/full/ .

# Remove any .env files from build context - we use Railway env vars in production
RUN find . -name ".env*" -type f ! -name ".env.example" ! -name ".env.template" -delete 2>/dev/null || true

# Ensure Convex generated files are available even if prune omitted the convex workspace
RUN mkdir -p convex/_generated
COPY --from=builder /app/convex/_generated ./convex/_generated

# Ensure scripts directory has execute permissions
RUN chmod +x apps/server/scripts/*.sh

# Copy lockfile/package manifests plus shared turbo config
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/turbo.json ./
RUN npm install

RUN rm -rf packages/db/generated/ packages/db/dist/
RUN npm run generate --filter=@repo/db
RUN npx turbo build --filter=@repo/db

# Build the server using turbo (handles workspace dependencies)
RUN npx turbo build --filter=server

# Runtime stage - minimal production image
FROM base AS runner
WORKDIR /app

# Install runtime dependencies and package managers (pnpm - yarn already included in node image)
RUN apk add --no-cache \
  bash \
  git \
  openssh-client \
  curl \
  && npm install -g pnpm@latest \
  && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 server && \
  adduser -D -u 1001 -G server server

# Create workspace directory with proper permissions
RUN mkdir -p /workspace && \
  chown -R server:server /workspace

# Copy built application and dependencies
COPY --from=installer --chown=server:server /app/apps/server/dist ./apps/server/dist
COPY --from=installer --chown=server:server /app/apps/server/package.json ./apps/server/package.json
COPY --from=installer --chown=server:server /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=installer --chown=server:server /app/apps/server/scripts ./apps/server/scripts
COPY --from=installer --chown=server:server /app/node_modules ./node_modules
COPY --from=installer --chown=server:server /app/packages ./packages
# Copy Convex generated files - required at runtime for server imports
COPY --from=installer --chown=server:server /app/convex/_generated ./convex/_generated

# Remove any .env files that might have been copied - use Railway env vars instead
RUN rm -f .env .env.local .env.production .env.development 2>/dev/null || true && \
    rm -f apps/server/.env apps/server/.env.local apps/server/.env.production 2>/dev/null || true

# Switch to non-root user
USER server

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port (Railway uses 8080)
EXPOSE 8080

# Health check - uses PORT env var (Railway sets PORT=8080)
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8080}/health || exit 1

# Start the server
CMD ["node", "apps/server/dist/server.js"]