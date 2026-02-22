# Stage 1: Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app/client
COPY flashcard-app/flashcard/client/package*.json ./
RUN npm install
COPY flashcard-app/flashcard/client/ ./
RUN npm run build

# Stage 2: Production server
FROM node:22-alpine
WORKDIR /app

COPY flashcard-app/flashcard/server/package*.json ./
RUN npm install --omit=dev

COPY flashcard-app/flashcard/server/ ./

COPY --from=frontend-build /app/public ./public

RUN mkdir -p /data/imports

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "index.js"]
