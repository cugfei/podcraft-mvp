# ---- Stage 1: Builder ----
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files first (for better layer caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the Next.js application (standalone mode for smaller image)
RUN pnpm run build

# ---- Stage 2: Runtime ----
FROM node:20-alpine

WORKDIR /app

# Install pnpm in runtime stage too
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install ONLY production dependencies
RUN pnpm install --frozen-lockfile --prod

# Copy built application from builder (Next.js standalone mode)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Generate Prisma client (if using Prisma)
# RUN pnpm exec prisma generate

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Switch to non-root user
USER appuser

# Expose port (matches Next.js default)
EXPOSE 3000

# Health check (use node to avoid curl dependency)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })" || exit 1

# Run Next.js in standalone mode
CMD ["node", "server.js"]
