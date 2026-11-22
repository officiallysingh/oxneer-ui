# Build from the repo root: docker build -f apps/web/Dockerfile .

# ---- deps: install workspace dependencies from the lockfile ----
FROM node:24-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json turbo.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages packages
RUN npm ci

# ---- builder: build the Next.js app (standalone output) ----
FROM node:24-alpine AS builder
WORKDIR /repo
COPY --from=deps /repo/node_modules node_modules
COPY . .
RUN npm run build

# ---- runner: minimal production image ----
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN apk add --no-cache dumb-init wget

# Standalone output keeps the monorepo layout (apps/web/server.js)
COPY --from=builder /repo/apps/web/.next/standalone ./
# Static assets and public/ must sit next to the nested app folder
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public ./apps/web/public

WORKDIR /app/apps/web
EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
