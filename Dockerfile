# ContextForge Docker Image
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S contextforge -u 1001

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    openssl \
    ca-certificates \
    curl \
    && rm -rf /var/cache/apk/*

# Copy built application from builder stage
COPY --from=builder --chown=contextforge:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=contextforge:nodejs /app/.next ./.next
COPY --from=builder --chown=contextforge:nodejs /app/public ./public
COPY --from=builder --chown=contextforge:nodejs /app/package*.json ./
COPY --from=builder --chown=contextforge:nodejs /app/prisma ./prisma/
COPY --from=builder --chown=contextforge:nodejs /app/scripts ./scripts/

# Copy configuration files
COPY --chown=contextforge:nodejs next.config.ts ./
COPY --chown=contextforge:nodejs middleware.ts ./

# Create data directory for SQLite database
RUN mkdir -p /app/data && chown contextforge:nodejs /app/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/prod.db"
ENV REDIS_URL="redis://redis:6379"

# Switch to non-root user
USER contextforge

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the application
CMD ["npm", "start"]

# Development stage
FROM node:18-alpine AS development

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    sqlite \
    openssl \
    ca-certificates \
    curl \
    git

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV NODE_ENV=development
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/dev.db"

# Expose ports (3000 for app, 5555 for Prisma Studio)
EXPOSE 3000 5555

# Start development server
CMD ["npm", "run", "dev"]