FROM node:20-alpine AS base

# Dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --frozen-lockfile

# Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 collector
RUN adduser --system --uid 1001 collector

COPY --from=builder --chown=collector:collector /app/dist ./dist
COPY --from=builder --chown=collector:collector /app/node_modules ./node_modules
COPY --from=builder --chown=collector:collector /app/package.json ./package.json

USER collector

# ENTRYPOINT, not CMD: the CronJobs in chart/templates/collector-cronjob.yaml pass
# args like ["--once", "--collector=scb"], and args replace CMD. With only a CMD the
# node:20-alpine ENTRYPOINT (docker-entrypoint.sh) would receive "--once" as its first
# argument, prepend "node", and run `node --once` — which exits 9. As an ENTRYPOINT the
# args are appended instead, and `docker run <image> --once --collector=scb` works too.
ENTRYPOINT ["node", "dist/index.js"]
