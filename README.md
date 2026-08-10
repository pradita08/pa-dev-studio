# PA DEV STUDIO — Monorepo

One repository holding the full PA DEV STUDIO website source: the public
landing page, the login pages, the admin panel, the API, and the Docker runtime
that ties them together.

They live in one repo rather than four because they ship together and share a
single `docker-compose.yml`, a single gateway, and a single `.env`. Splitting
them would mean three extra repositories whose versions have to be matched by
hand on every change.

## What's Inside

| Folder | Contents | Stack |
|---|---|---|
| [`_app_padev_landing/`](_app_padev_landing/) | Public homepage | React 19 + Vite + Express |
| [`_app_padev_auth/`](_app_padev_auth/) | Login and status pages | HTML + Tailwind |
| [`_app_padev_admin/`](_app_padev_admin/) | Admin dashboard | HTML + Tailwind |
| [`_api_padev/`](_api_padev/) | JWT API + server for the auth/admin pages | Express + MySQL |
| [`_docker/`](_docker/) | Per-service Dockerfiles and gateway config | Nginx, Node 22 |

Each folder has its own `README.md` covering it in more detail.

## Layout

```text
pa-dev-studio/
├── _app_padev_landing/   # React public homepage, Node.js, tests, public assets
├── _app_padev_auth/      # PA DEV Auth theme (source, built inside Docker)
├── _app_padev_admin/     # PA DEV Admin theme (source, built inside Docker)
├── _api_padev/           # Express + JWT + MySQL, serves /auth and /adminpanel
├── _docker/
│   ├── node/Dockerfile   # public React runtime
│   ├── api/Dockerfile    # API runtime + builds both themes
│   └── gateway/          # Nginx, single origin
├── docs/                 # cross-project documentation
├── .env.example
├── .dockerignore
└── docker-compose.yml
```

## How It Fits Together

The whole site is served from a **single origin** on port `1080`. The Nginx
gateway takes every request first and forwards it to the right service:

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
                                          └──────────────────┘
```

The single origin is not a style choice: `httpOnly` session cookies only apply
when the admin pages and the API share the same origin. Split across ports, the
browser never sends the session cookie and login always fails.

Full explanation in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Port Map

| Port | Contents |
|---|---|
| `1080` | Gateway — the official entry point for the whole site |
| `1081` | MySQL |
| `1082` | API directly, for debugging |
| `1083` | Public React directly, for debugging |

Ports `1082` and `1083` exist only to inspect one service without the gateway
while chasing a problem. The real path is always `1080`.

## Running It

Once, up front, prepare the API environment:

```bash
cp .env.example .env
openssl rand -hex 32          # paste into JWT_SECRET
# fill in ADMIN_EMAIL and ADMIN_PASSWORD
```

Then:

```bash
docker compose config --quiet
docker compose up -d --build
```

| URL | Contents |
|---|---|
| `http://localhost:1080/` | Public React homepage |
| `http://localhost:1080/auth/` | Login page |
| `http://localhost:1080/adminpanel/dashboard.html` | Admin dashboard (session required) |
| `http://localhost:1080/health` | React health check |
| `http://localhost:1080/api-health` | API health check |

## Verifying

```bash
docker compose config --quiet
docker compose build
cd _app_padev_landing && npm test    # public frontend tests
cd ../_api_padev && npm test         # token and login throttle tests
```

## Adding New Source Code

Adding a new project to this repo — a second API, a blog, a client dashboard?
The steps are in [`docs/ADDING-A-PROJECT.md`](docs/ADDING-A-PROJECT.md): folder
naming, Dockerfile, compose service, gateway route, down to `.gitignore`.

In short: a new root folder prefixed `_app_` or `_api_`, a Dockerfile under
`_docker/<name>/`, one service in `docker-compose.yml`, one `location` in the
gateway config, and one `README.md` inside the project folder.

## Active Stack

- React + Vite for the application-warehouse interface.
- Node.js + Express to serve the production build and a health endpoint.
- Express + JWT + MySQL for authentication and the admin pages.
- PA DEV Auth and PA DEV Admin (HTML + Tailwind) as the login and dashboard
  surfaces, vendored from `10 Products/01 Backend Themes/01 PADEV Admin`.
- Locally hosted Inter, licensed under the SIL Open Font License.
- Docker Compose with an Nginx gateway on port `1080`.
- MySQL on port `1081`. The legacy CodeIgniter 4 + Shield schema inside it is
  never read or modified; the API uses `padev_`-prefixed tables only.

## What Must Not Land Here

New planning documents, raw design assets, and credentials. `.env` is already
git-ignored — only `.env.example`, with no real values, is committed. Planning
material stays in the `00`–`05` folders outside this repo.

## Notes for Codex/AI

Do not delete volumes, and do not touch the legacy CodeIgniter 4 + Shield
tables (`users`, `auth_identities`, `auth_groups_users`, and so on) in the
`pa_dev` database — they hold real data and do not belong to this runtime. All
tables owned by the API are prefixed `padev_`. Run Docker from this folder.

File ownership boundaries are recorded in
`00 Governance/HANDOVER_2026-08-09_AUTH_ADMIN.md`.
