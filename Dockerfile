# syntax=docker/dockerfile:1.7

# Korevel Xenon — Next.js 16 multi-stage Docker build.
#
# Targets:
#   dev     — hot-reloading development server (used by docker compose --profile dev)
#   runner  — minimal standalone production server (default)

FROM oven/bun:1.4.2-alpine AS base
# libc6-compat lets glibc-linked native prebuilds run on musl.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── dependencies ────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json bun.lock ./
# copyfile backend keeps node_modules traceable by Next.js standalone NFT.
RUN bun install --frozen-lockfile --backend=copyfile

# ── development (hot reload) ────────────────────────────────────────────────
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["bun", "x", "next", "dev", "-H", "0.0.0.0", "-p", "3000"]

# ── build ───────────────────────────────────────────────────────────────────
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* values are inlined at build time. The Bunny Studio token is a
# public frontend token by design, so passing it as a build arg is safe.
ARG NEXT_PUBLIC_BUNNY_STUDIO_API_TOKEN
ENV NEXT_PUBLIC_BUNNY_STUDIO_API_TOKEN=$NEXT_PUBLIC_BUNNY_STUDIO_API_TOKEN
RUN bun run build

# ── production runner ───────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
