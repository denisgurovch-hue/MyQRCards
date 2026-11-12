# Build context: repository root
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY apps/api ./apps/api
WORKDIR /app/apps/api
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ARG GIT_SHA=unknown
ENV NODE_ENV=production
ENV API_PORT=3001
ENV GIT_SHA=$GIT_SHA

RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Runtime needs production modules + prisma CLI for migrate deploy
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/package.json ./package.json
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /var/lib/myqrcards/card-photos \
  && chown -R nestjs:nodejs /app /var/lib/myqrcards

USER nestjs
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=5s --start-period=40s --retries=10 \
  CMD wget -qO- http://127.0.0.1:3001/api/v1/healthz >/dev/null || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
