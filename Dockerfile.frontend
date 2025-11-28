# Frontend Dockerfile - Turborepo monorepo (simplified, no prune)
# Cache buster: 2025-11-26-v2
FROM node:22-alpine AS base

# Installer stage - install dependencies and build
FROM base AS installer
RUN apk update && apk add --no-cache libc6-compat
WORKDIR /app

# Build-time arguments for NEXT_PUBLIC_* variables
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=$NEXT_PUBLIC_SERVER_URL

# Copy package files and source (needed for workspace resolution)
COPY package*.json ./
COPY turbo.json ./
COPY apps/frontend/ ./apps/frontend/
COPY packages/ ./packages/

# Install dependencies
RUN npm install --frozen-lockfile || npm install

# Generate Prisma client (needed by frontend for BetterAuth)
RUN npm run generate --filter=@repo/db

# Build the frontend (NEXT_PUBLIC_* vars are baked in at build time)
RUN npm run build --filter=frontend

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
