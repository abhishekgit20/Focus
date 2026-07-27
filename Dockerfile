# Multi-stage build for production
FROM node:26-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
RUN npm ci

# Production-only install for the final runtime image. The build itself
# needs devDependencies (esbuild/vite/typescript/tsx/...), but none of that
# tooling runs in production — esbuild in particular ships a compiled Go
# binary that container-scanned as a pile of Go-stdlib CVEs (crypto/tls,
# net/http2, etc.) even though esbuild never runs as a network-facing
# service, only as a build-time bundler. Shipping the dev-inclusive
# node_modules into the runner stage put that binary (and everything else
# that's irrelevant at runtime) into the deployed image for no reason.
# Confirmed via `npm ls esbuild --all` that every path to esbuild in the
# tree comes through devDependencies only (drizzle-kit, tsx, vite, and the
# direct devDependency) — omitting dev here can't remove anything the
# running app actually needs.
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NODE_ENV=production
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Defense-in-depth: the app's own date math (server/lib/istDate.ts) no longer
# depends on the server's local clock, but this still protects anything else
# that calls Date's local getHours()/toLocaleString()/etc. (e.g. log
# timestamps) from silently reflecting UTC instead of the business's actual
# timezone. Alpine ships no tzdata by default, so TZ alone would be a no-op
# without installing it first.
RUN apk add --no-cache tzdata
ENV TZ=Asia/Kolkata

ENV NODE_ENV=production
ENV PORT=5000

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# The base image's bundled npm CLI (and its own internal node-tar
# dependency) is never invoked at runtime -- this container only ever runs
# `node dist/index.cjs`. Trivy flags CVEs in that bundled tar copy even
# though it's dead weight, so remove the npm/npx/corepack install entirely
# rather than carrying unused, vulnerable code into the shipped image.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs

EXPOSE 5000

ENV HOSTNAME="0.0.0.0"

CMD ["node", "dist/index.cjs"]

