# Adding a New Project to the Monorepo

How to add new source code — a second API, a blog, a client dashboard, whatever
it is — so it joins one repo, one `docker compose up`, and one entry point.

The examples below use `_app_padev_blog` on internal port `3100` and debug port
`1084`. Substitute your own names.

## Steps at a Glance

| # | Step | File |
|---|---|---|
| 1 | Create the project folder | `_app_padev_blog/` |
| 2 | Write the project `README.md` | `_app_padev_blog/README.md` |
| 3 | Add a Dockerfile | `_docker/blog/Dockerfile` |
| 4 | Register the service | `docker-compose.yml` |
| 5 | Add the gateway route | `_docker/gateway/default.conf` |
| 6 | Ignore build artifacts | `.gitignore`, `.dockerignore` |
| 7 | Update the maps | `README.md`, `docs/ARCHITECTURE.md` |
| 8 | Verify | `docker compose config --quiet` |

## 1. Folder Naming

New folders go at the repo root, never inside another project. The prefix
states the role:

| Prefix | For | Example |
|---|---|---|
| `_app_` | Anything with a user-facing surface | `_app_padev_landing` |
| `_api_` | Headless services | `_api_padev` |
| `_docker` | Runtime files, not source | `_docker/gateway` |

Use `snake_case` and name the product: `_app_padev_blog`, not `_blog` or
`_app_new_blog`.

## 2. Project README

Every project folder must carry a `README.md`. At minimum: what it does, how to
run it locally, and what is easy to get wrong. A worked example already exists
at [`_api_padev/README.md`](../_api_padev/README.md).

This is what keeps the repo readable once there are six projects in it.

## 3. Dockerfile

Put it at `_docker/<short-name>/Dockerfile`, not inside the project folder. All
Dockerfiles sit together so runtimes are easy to compare.

**The most common mistake:** the build context is the repo root, so every
`COPY` is written in full from the root — `COPY _app_padev_blog/package.json ./`,
never `COPY package.json ./`.

```dockerfile
# _docker/blog/Dockerfile
FROM node:22-alpine AS dependencies
WORKDIR /app
COPY _app_padev_blog/package.json _app_padev_blog/package-lock.json ./
RUN npm ci

FROM dependencies AS build
COPY _app_padev_blog/ ./
RUN npm run build

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV PORT=3100
WORKDIR /app

COPY _app_padev_blog/package.json _app_padev_blog/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY _app_padev_blog/server.js ./server.js

USER node
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3100/health >/dev/null || exit 1

CMD ["node", "server.js"]
```

Three things not to skip, because all three are already house style here: a
build stage separate from the runtime stage (the toolchain stays out of the
final image), `USER node` (nothing runs as root), and a `HEALTHCHECK` (so
Compose knows the service is actually ready, not merely alive).

## 4. Service in docker-compose.yml

```yaml
  pa_dev_blog:
    build:
      context: .
      dockerfile: _docker/blog/Dockerfile
    container_name: pa_dev_blog
    ports:
      # Direct access for debugging; the real path is through the gateway.
      - "1084:3100"
    environment:
      NODE_ENV: production
      PORT: 3100
    restart: unless-stopped
    networks:
      - app-network
```

It must join `app-network` — otherwise the gateway cannot resolve it.

Needs a database? Add `depends_on` with `condition: service_healthy`, the way
`pa_dev_api` does, so it never starts before MySQL can accept connections.

Needs secrets? Add `env_file: [.env]` and declare the variables in
`.env.example` **without real values**.

Then add the debug port to the port map table in `README.md`.

## 5. Gateway Route

Add an upstream and a `location` in
[`_docker/gateway/default.conf`](../_docker/gateway/default.conf):

```nginx
upstream padev_blog {
    server pa_dev_blog:3100;
}

# ... inside the server block:
    location /blog {
        proxy_pass http://padev_blog;
    }
```

Nginx picks the longest matching prefix, so `location /blog` beats `location /`
without any ordering tricks. What does need care: the new prefix must not
collide with one already in use — `/`, `/auth`, `/adminpanel`, `/api`,
`/uploads`, `/health`, `/api-health`.

Also add `pa_dev_blog` to the `depends_on` list of the `gateway` service.

The result is reachable at `http://localhost:1080/blog` — same origin as
everything else, so session cookies apply to it if it needs them.

## 6. Ignore Rules

Add to `.gitignore`:

```gitignore
_app_padev_blog/node_modules/
_app_padev_blog/dist/
```

and to `.dockerignore` (no trailing slash):

```gitignore
_app_padev_blog/node_modules
_app_padev_blog/dist
```

`.env` and its variants are already ignored repo-wide, so there is no need to
repeat them per project.

Check the result before committing:

```bash
git status --short          # no node_modules, no dist
git check-ignore -v _app_padev_blog/node_modules
```

## 7. Update the Maps

Three places keep the repo honest about its own contents:

- `README.md` — the **What's Inside** table, the **Layout** block, the **Port Map**
- `docs/ARCHITECTURE.md` — the diagram and the route-prefix table
- `.env.example` — if any new variables were introduced

Documentation left un-updated is more misleading than no documentation at all.

## 8. Verify

```bash
docker compose config --quiet     # is the compose file valid?
docker compose build pa_dev_blog  # does the image build?
docker compose up -d
curl -I http://localhost:1080/blog
docker compose ps                 # status must be healthy, not just running
```

## If the New Project Needs Database Tables

Prefix table names with `padev_`. The `pa_dev` database also contains legacy
CodeIgniter 4 + Shield tables that belong to a different system and must not be
touched — the prefix is what keeps that boundary visible.

## If the New Project Really Stands Alone

Not everything belongs in this repo. If a project has its own release cycle,
shares no `.env`, and never needs to pass through the gateway — internal
tooling or an experiment, say — a separate repository is the better fit. This
monorepo is for the things that go up and down together.
