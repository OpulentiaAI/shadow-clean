# Frontend Dockerfile - Optimized for Turborepo monorepo
FROM node:22-alpine AS base

# Builder stage - prunes monorepo and installs dependencies
FROM base AS builder
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# Install turbo globally
RUN npm install -g turbo@^2

# Copy entire monorepo for pruning
COPY . .

# Generate a partial monorepo with pruned lockfile for frontend workspace
RUN turbo prune frontend --docker

# Installer stage - installs dependencies from pruned workspace
FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# Copy lockfile and package.json files from pruned workspace
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/turbo.json ./
RUN npm install

# Copy source files and build
COPY --from=builder /app/out/full/ .

# Generate Prisma client (needed by frontend for BetterAuth)
RUN npm run generate --filter=@repo/db

# Build the frontend
RUN npx turbo build --filter=frontend

# Runtime stage - minimal production image
FROM base AS runner
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache curl

# Create non-root user
RUN addgroup -g 1001 nodejs && \
  adduser -D -u 1001 -G nodejs nextjs

# Copy built application
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=installer --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

# Switch to non-root user
USER nextjs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start Next.js
CMD ["node", "apps/frontend/server.js"]
