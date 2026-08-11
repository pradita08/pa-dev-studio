# PA DEV STUDIO — API autentikasi + halaman auth/adminpanel.
#
# Dua template statis dibangun di stage terpisah memakai script bawaannya,
# lalu hasil dist-nya disalin ke image runtime. Toolchain Tailwind tidak ikut
# ke image akhir.

FROM node:22-alpine AS auth-build
WORKDIR /build
COPY _app_padev_auth/package.json _app_padev_auth/package-lock.json ./
RUN npm ci
COPY _app_padev_auth/ ./
RUN npm run build

FROM node:22-alpine AS admin-build
WORKDIR /build
COPY _app_padev_admin/package.json _app_padev_admin/package-lock.json ./
RUN npm ci
COPY _app_padev_admin/ ./
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
ENV PORT=4000

WORKDIR /app

COPY _api_padev/package.json _api_padev/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY _api_padev/server.js ./server.js
COPY _api_padev/src ./src
# Perkakas pemeliharaan yang dijalankan manual di dalam container, mis.
# `npm run menu:apply` untuk menyusun ulang registry menu.
COPY _api_padev/scripts ./scripts

COPY --from=auth-build /build/dist ./public/auth
COPY --from=admin-build /build/dist ./public/adminpanel

RUN mkdir -p /app/uploads && chown -R node:node /app/uploads

USER node

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=5 \
  CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1

CMD ["node", "server.js"]
