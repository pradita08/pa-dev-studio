# Architecture

How the four projects in this repository combine into one site.

## One Origin, Four Services

```text
                    ┌─────────────────────────┐
  browser ────────► │  gateway (Nginx, :1080) │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴──────────────────┐
              │                                    │
      /  /health                    /auth  /adminpanel  /api  /uploads
              │                                    │
      ┌───────▼────────┐                  ┌────────▼─────────┐
      │ pa_dev  :3000  │                  │ pa_dev_api :4000 │
      │ React + Vite   │                  │ Express + JWT    │
      └────────────────┘                  └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │  mysql   :3306   │
                                          │  volume: mysql_data
                                          └──────────────────┘
```

The exact route table lives in [`_docker/gateway/default.conf`](../_docker/gateway/default.conf).

| Prefix | Target | Why |
|---|---|---|
| `/` | `pa_dev` | Public homepage, needs no session |
| `/health` | `pa_dev` | React health check |
| `/auth` | `pa_dev_api` | Login pages, served by the process that owns tokens |
| `/adminpanel` | `pa_dev_api` | Admin dashboard, guarded by that same token check |
| `/api` | `pa_dev_api` | JWT API |
| `/uploads` | `pa_dev_api` | Content images from the `padev_uploads` volume |
| `/api-health` | `pa_dev_api` → `/health` | API health check, renamed to avoid a clash |

## Why a Single Origin

Admin sessions ride on an `httpOnly` cookie. Cookies like that are bound to an
origin — scheme, host, and port together. If the admin pages were served on
`:1082` and the API on `:1080`, the browser would treat them as two origins and
never send the session cookie to the API. Login would appear to succeed and
then be rejected on the very next request.

The gateway removes that entire class of problem: one port, one origin, no
CORS, no cross-port cookies.

## Why the API Serves the Admin Pages, Not Nginx

`/auth` and `/adminpanel` are static HTML built by Tailwind — Nginx could serve
them directly. But the admin pages require a session, and if Nginx enforced
that, there would be two definitions of "logged in": the Nginx rules and the
token check in Express. Two definitions that can drift apart are a security
hole waiting to happen.

So `_api_padev` serves them, behind exactly the same token-verification
middleware that guards the API.

## Build: Four Sources, Three Images

`_app_padev_auth` and `_app_padev_admin` have no image of their own. Both are
built in separate stages inside [`_docker/api/Dockerfile`](../_docker/api/Dockerfile),
and only their `dist` output is copied into the API runtime image:

```text
_app_padev_auth/  ──build──►  dist  ──►  /app/public/auth
_app_padev_admin/ ──build──►  dist  ──►  /app/public/adminpanel
_api_padev/       ────────────────────►  /app
```

The Tailwind toolchain never reaches the final image.

The same applies to the landing page in [`_docker/node/Dockerfile`](../_docker/node/Dockerfile):
the build stage runs Vite, and the runtime stage receives only `dist`,
`server.js`, and production dependencies.

## The Build Context Is Always the Repo Root

Every service uses `context: .` — the repo root, not the project folder. That
is why each `COPY` is written out in full from the root:

```dockerfile
COPY _app_padev_landing/package.json _app_padev_landing/package-lock.json ./
```

Not `COPY package.json ./`. This is what lets a single Dockerfile pull from
several projects at once — as `_docker/api/Dockerfile` does across three
folders. It also means `.dockerignore` patterns are written as full paths from
the root.

## Data That Survives Rebuilds

| Volume | Contents | If deleted |
|---|---|---|
| `mysql_data` | The entire `pa_dev` database | All content and accounts are gone |
| `padev_uploads` | Admin-uploaded images | Content cards lose their images |

Images live in a volume rather than the image on purpose: baked into the image,
every rebuild would wipe every upload.

The `pa_dev` database also holds legacy CodeIgniter 4 + Shield tables (`users`,
`auth_identities`, `auth_groups_users`, and so on) that do **not** belong to
this runtime. Every table owned by the API is prefixed `padev_`.

## Environment

Only `pa_dev_api` reads `.env` (see `env_file` in
[`docker-compose.yml`](../docker-compose.yml)). The landing page needs no
secrets — everything it uses is public the moment the page reaches the browser.

Changing `JWT_SECRET` invalidates every session currently in flight.
