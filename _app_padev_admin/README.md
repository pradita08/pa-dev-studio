# _app_padev_admin — Admin dashboard

Static HTML + Tailwind for the admin panel, served under `/adminpanel/` and
requiring a session.

Vendored from `10 Products/01 Backend Themes/01 PADEV Admin`. Substantial
changes belong in that source product and should then be copied over whole,
rather than patched piecemeal in two places.

## Pages

| File | Purpose |
|---|---|
| `dashboard.html` | Landing screen after login |
| `padev-articles.html` | Articles module |
| `padev-projects.html` | Projects module |
| `padev-templates.html` | Templates module |
| `padev-inquiries.html` | Contact submissions (read and triage only) |
| `padev-users.html` · `padev-users-form.html` | User management |
| `padev-user-groups.html` · `padev-user-groups-form.html` | Group management |
| `padev-menu-permissions.html` · `padev-menu-permissions-form.html` | Menu and permission catalog |
| `padev-profile.html` | Signed-in user's own profile |

## Contents

```text
_app_padev_admin/
├── src/
│   ├── pages/                      # one HTML file per page
│   ├── css/input.css               # Tailwind entry
│   ├── js/
│   │   ├── padev-admin-crud.js     # generic CRUD engine for content modules
│   │   ├── padev-admin-um*.js      # user-management screens
│   │   ├── padev-admin-session.js  # session handling in the browser
│   │   ├── padev-tables.js         # shared table engine
│   │   ├── sidebar.js, theme-*.js  # shell behaviour
│   │   └── i18n*.js, locales/      # translations
│   └── assets/
├── scripts/
│   ├── build.mjs                   # → dist/
│   ├── build-padev-pages.mjs       # generates module pages from the shell
│   ├── restore-missing-pages.mjs   # restores upstream theme pages
│   └── dev.mjs                     # preview server
└── tailwind.config.js
```

## One Shell, Generated Pages

Every admin page carries the full shell — sidebar, navbar, footer — inline.
`build-padev-pages.mjs` therefore generates module pages by taking
`dashboard.html` and swapping only the contents of `<main>`. New pages come out
looking identical without a single class being redrawn, and they keep inheriting
theme updates.

The `<main>` body is deliberately generic: tables, toolbars, and form modals are
assembled at runtime by `padev-admin-crud.js` from each page's configuration.
Four modules share one engine instead of four copies of the same markup.

That is also why editing generated module pages by hand is the wrong move —
change the shell or the page configuration, then rebuild.

## Running Locally

```bash
npm install
npm run dev        # build, then preview server
npm run dev:css    # Tailwind watch, run in a second terminal
```

## No Image of Its Own

This folder never becomes its own container. It is built in the `admin-build`
stage of [`_docker/api/Dockerfile`](../_docker/api/Dockerfile), and its `dist`
output is copied into the API image at `/app/public/adminpanel`.

The API serves these pages so that "logged in" has exactly one definition
across the pages and the API. The reasoning is in
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

Practically: `npm run build` here is for local preview only. What ships is
always rebuilt during `docker compose build`.
