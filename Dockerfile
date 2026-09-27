# syntax=docker/dockerfile:1
FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Stage: dependencies
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store npm ci

# Stage: builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store npx nuxt build

# Stage: production
FROM node:22-slim AS production
WORKDIR /app

# Install LibreOffice headless untuk konversi PPT/PPTX → PDF
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     libreoffice-impress \
     libreoffice-common \
     libreoffice-core-nogui \
     fonts-liberation \
     fonts-dejavu \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NUXT_HOST=0.0.0.0
ENV NUXT_PORT=3000

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/public ./public
COPY --from=builder /app/server ./server
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
