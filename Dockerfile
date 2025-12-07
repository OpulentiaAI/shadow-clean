FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/sidecar/package*.json apps/sidecar/
RUN npm ci
COPY . .
WORKDIR /app/apps/sidecar
RUN npm run build
EXPOSE 8080
CMD ["node", "dist/server.js"]
