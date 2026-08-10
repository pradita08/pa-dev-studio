# _app_padev_auth — Authentication pages

Static HTML + Tailwind for login and every status page, sharing one visual
language with the public landing page.

Vendored from `10 Products/01 Backend Themes/01 PADEV Admin`. Substantial
changes belong in that source product and should then be copied over whole,
rather than patched piecemeal in two places.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Login |
| `register.html` | Registration |
| `forgot-password.html` · `check-email.html` | Password recovery flow |
| `reset-password.html` · `reset-success.html` | Password reset flow |
| `pending-approval.html` | Account awaiting approval |
| `error-401/403/404/419/429/500.html` | Status pages |
| `maintenance.html` · `coming-soon.html` | Holding pages |

## Contents

```text
_app_padev_auth/
├── src/
│   ├── pages/          # one HTML file per page
│   ├── layouts/        # shared scaffolding
│   ├── css/input.css   # Tailwind entry
│   ├── js/
│   └── assets/
├── scripts/
│   ├── build.mjs       # → dist/
│   ├── dev.mjs         # preview server
│   └── build-pages.py
└── tailwind.config.js
```

## Running Locally

```bash
npm install
npm run dev        # build, then preview server
npm run dev:css    # Tailwind watch, run in a second terminal
```

## No Image of Its Own

This folder never becomes its own container. It is built in the `auth-build`
stage of [`_docker/api/Dockerfile`](../_docker/api/Dockerfile), and its `dist`
output is copied into the API image at `/app/public/auth`, served under
`/auth/`.

The login page is served by the same process as the API so that session
enforcement has exactly one definition. The reasoning is in
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md).

Practically: `npm run build` here is for local preview only. What ships is
always rebuilt during `docker compose build`.
