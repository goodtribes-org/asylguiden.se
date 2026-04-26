FROM node:20-alpine AS base

# Dependencies — use workspace root lock file for consistent resolution
FROM base AS deps
RUN apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY collector/package.json ./collector/
RUN npm ci

# Build
FROM base AS builder
RUN apk add --no-cache vips-dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY backend/ .
ENV NODE_ENV=production
RUN npm run build

# Runner
FROM base AS runner
RUN apk add --no-cache vips-dev
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 strapi
RUN adduser --system --uid 1001 strapi

COPY --from=builder --chown=strapi:strapi /app ./

USER strapi

EXPOSE 1337
CMD ["npm", "run", "start"]
