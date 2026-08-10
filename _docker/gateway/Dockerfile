# Gateway Nginx: satu origin untuk homepage React, halaman auth/admin, dan API.
FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf
COPY _docker/gateway/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:80/health >/dev/null || exit 1
