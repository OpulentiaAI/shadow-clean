FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/sidecar/package*.json apps/sidecar/
RUN npm ci
COPY . .
WORKDIR /app/apps/sidecar
RUN npm run build
EXPOSE 8080
# Force rebuild marker: 2025-12-07
CMD ["node", "dist/server.js"]
