FROM node:22-alpine AS base

# 1. Install dependencies only when needed
FROM base AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN --mount=type=cache,target=/root/.npm \
    if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i; \
    else echo "Lockfile not found." && exit 1; \
    fi

# 2. Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generate version.json if not present (for local builds without Git), create data directory, and build
# Set SKIP_PREBUILD to skip linting during Docker builds for speed
# Note: CI builds should pre-generate version.json before docker build for accurate Git metadata
RUN if [ ! -f version.json ]; then node scripts/generate-version.mjs; fi && \
    mkdir -p ./data/db && \
    SKIP_PREBUILD=true npm run build

# 3. Production image, copy all the files and run next
FROM base AS runner
LABEL org.opencontainers.image.description="HD Homey - A Next.js proxy for HDHomeRun devices enabling secure remote access to live TV streams. Visit https://github.com/shaunburdick/hd-homey for more information."
WORKDIR /app

ENV NODE_ENV=production

# Install ffmpeg with required codecs for video transcoding
RUN apk add --no-cache ffmpeg

# Combine user creation commands
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/public ./public
COPY --from=builder /app/version.json ./version.json

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy migration script and dependencies
COPY --from=builder --chown=nextjs:nodejs /app/src/scripts/migrate.mjs ./src/scripts/migrate.mjs
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3

# Copy entrypoint script
COPY --chown=nextjs:nodejs docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Create data directory with correct ownership
RUN mkdir -p ./data && chown -R nextjs:nodejs ./data

USER nextjs

EXPOSE 3000

ENV PORT=3000 \
    HOSTNAME=0.0.0.0

CMD ["./docker-entrypoint.sh"]
