FROM node:22-alpine AS dependencies

WORKDIR /app

COPY _app_padev_landing/package.json _app_padev_landing/package-lock.json ./
RUN npm ci

FROM dependencies AS build

COPY _app_padev_landing/ ./
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

COPY _app_padev_landing/package.json _app_padev_landing/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY _app_padev_landing/server.js ./server.js

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health >/dev/null || exit 1

CMD ["node", "server.js"]
