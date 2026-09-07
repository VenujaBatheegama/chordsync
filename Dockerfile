# Stage 1: Build client
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

# Stage 2: Build server
FROM node:22-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm install
COPY server/ .
RUN npx tsc

# Stage 3: Production image
FROM node:22-alpine AS production
WORKDIR /app

# Copy server dist and deps
COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /app/server/package.json ./server/package.json
COPY --from=server-builder /app/server/prisma ./server/prisma

# Copy built client
COPY --from=client-builder /app/client/dist ./client/dist

# Create data directory for SQLite
RUN mkdir -p /data

WORKDIR /app/server

ENV DATABASE_URL="file:/data/chordsync.db"
ENV PORT=3001
ENV NODE_ENV=production

# Run Prisma migrations then start
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]

EXPOSE 3001
