# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# Stage 2: Production
FROM node:22-alpine
WORKDIR /app

# Install server deps
COPY server/package*.json ./
RUN npm install --omit=dev

# Copy server code
COPY server/ ./

# Copy built frontend
COPY --from=frontend-build /app/public ./public

# Create data directory for imports
RUN mkdir -p /data/imports

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "index.js"]
