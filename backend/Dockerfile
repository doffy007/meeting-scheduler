# Stage 1: Build
FROM oven/bun:1-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript code
RUN bun run build

# Stage 2: Production
FROM oven/bun:1-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install production dependencies only
RUN bun install --production --frozen-lockfile

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy JWT keys (untuk development, production gunakan volumes/secrets)
COPY --from=builder /app/src/cred ./src/cred

# Copy migrations
COPY --from=builder /app/migrations ./migrations

# Create non-root user for security
RUN addgroup -g 1001 -S bunuser && \
    adduser -S bunuser -u 1001 && \
    chown -R bunuser:bunuser /app

# Switch to non-root user
USER bunuser

# Set environment to production
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD bun -e "fetch('http://localhost:8080/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Start application
CMD ["bun", "run", "dist/index.js"]