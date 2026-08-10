# _docker — Runtime files

Dockerfiles and gateway configuration. No application source lives here.

They sit together, outside the project folders, so runtimes can be compared
side by side and so a single Dockerfile can pull from several projects at once.

## Contents

```text
_docker/
├── gateway/
│   ├── Dockerfile      # Nginx, the single entry point
│   └── default.conf    # route table for the whole site
├── node/Dockerfile     # public React runtime  → service pa_dev
└── api/Dockerfile      # API runtime + builds both themes → service pa_dev_api
```

Services, ports, and volumes are declared in
[`../docker-compose.yml`](../docker-compose.yml).

## Build Context Is the Repo Root

Every service is built with `context: .` — the repo root. So every `COPY` is
written out in full from there:

```dockerfile
COPY _app_padev_landing/package.json _app_padev_landing/package-lock.json ./
```

Not `COPY package.json ./`. This is what allows `api/Dockerfile` to reach into
three project folders in one build. It also means `.dockerignore` patterns are
written as full paths from the root.

## api/Dockerfile Builds Three Projects

| Stage | Source | Output |
|---|---|---|
| `auth-build` | `_app_padev_auth/` | `/app/public/auth` |
| `admin-build` | `_app_padev_admin/` | `/app/public/adminpanel` |
| `runtime` | `_api_padev/` | `/app` |

Only the `dist` folders are carried over, so the Tailwind toolchain never
reaches the final image.

`/app/uploads` is created and handed to the `node` user, then mounted from the
`padev_uploads` volume at runtime — uploads must not live inside the image, or
every rebuild would erase them.

## House Style for New Dockerfiles

- A build stage separate from the runtime stage, so toolchains stay out of the
  final image.
- `USER node` — nothing runs as root.
- A `HEALTHCHECK`, so Compose can tell ready from merely running, and
  `depends_on: condition: service_healthy` actually means something.
- Pinned base image (`node:22-alpine`), not a floating tag.

Adding a service? The full walkthrough is in
[`../docs/ADDING-A-PROJECT.md`](../docs/ADDING-A-PROJECT.md).

## Gateway

`gateway/default.conf` is the route table for the entire site: which prefix
goes to which service, and the forwarded headers the API relies on
(`X-Real-IP` and `X-Forwarded-For` feed the login throttle, so dropping them
would make every request look like it came from the same client).

Prefixes already taken: `/`, `/auth`, `/adminpanel`, `/api`, `/uploads`,
`/health`, `/api-health`.
