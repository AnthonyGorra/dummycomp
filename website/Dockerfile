# syntax=docker/dockerfile:1.4

# Optimized Dockerfile for Website Application
# Features:
# - Multi-stage build with BuildKit cache mounts
# - Minimal production image
# - Security best practices

# ============================================
# Stage 1: Base image
# ============================================
FROM node:18-alpine AS base

RUN apk add --no-cache \
    libc6-compat \
    tini

WORKDIR /app

RUN corepack enable

# ============================================
# Stage 2: Dependencies
# ============================================
FROM base AS deps

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/app/.npm \
    npm ci --prefer-offline --no-audit

# ============================================
# Stage 3: Development dependencies
# ============================================
FROM deps AS deps-dev

RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --include=dev

# ============================================
# Stage 4: Builder
# ============================================
FROM base AS builder

WORKDIR /app

COPY --from=deps-dev /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ============================================
# Stage 5: Production dependencies
# ============================================
FROM base AS prod-deps

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --prefer-offline --no-audit

RUN npm cache clean --force

# ============================================
# Stage 6: Runner
# ============================================
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["node", "server.js"]

LABEL org.opencontainers.image.title="Website"
LABEL org.opencontainers.image.description="Marketing website for DummyComp"
LABEL org.opencontainers.image.vendor="DummyComp"
