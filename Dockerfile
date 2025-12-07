FROM node:18-alpine
WORKDIR /app
# Copy only sidecar package.json to avoid monorepo postinstall scripts
COPY apps/sidecar/package.json ./
RUN npm install
COPY apps/sidecar/ ./apps/sidecar/
WORKDIR /app/apps/sidecar
RUN npm run build
EXPOSE 8080
# Force rebuild marker: 2025-12-07
CMD ["node", "dist/server.js"]
