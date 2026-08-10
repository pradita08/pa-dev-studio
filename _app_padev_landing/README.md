# _app_padev_landing — Public homepage

React 19 + Vite for the interface, Express to serve the build output. This is
the only part of the site visible without logging in.

It runs as the `pa_dev` service and receives every request no other prefix
claims at the gateway (`/` and `/health`).

## Contents

```text
_app_padev_landing/
├── index.html          # Vite HTML entry
├── src/
│   ├── main.jsx        # React mount
│   ├── App.jsx         # the whole page
│   └── styles.scss     # Sass, single file
├── public/assets/      # images, icons, locally hosted Inter
├── tests/              # node --test
├── server.js           # Express: serves dist, exposes /health
└── vite.config.js
```

## Running Locally

```bash
npm install
npm run dev        # Vite dev server, hot reload
```

To exercise the build the way production does:

```bash
npm run build      # → dist/
npm start          # Express serves dist on PORT (default 3000)
```

## Tests

```bash
npm test
```

`tests/content.test.js` covers the page content that comes from the content
API — the part most likely to break invisibly during a visual change.

## Light and Dark Images

This page uses a `ThemeImage` component: the light **and** dark files are both
rendered, and CSS hides one of them. The consequence is that a single image
leaves an empty card in one of the modes — and that only shows up after
publishing.

So the API rejects `published` content whose images are not paired. The full
rule is documented in [`_api_padev/README.md`](../_api_padev/README.md).

## No Secrets Here

This project does not read `.env`, and should not. Anything that reaches the
frontend bundle is public the moment the page is delivered to a browser. Keys
and credentials stay in `_api_padev`.

## Docker Runtime

Built by [`_docker/node/Dockerfile`](../_docker/node/Dockerfile) — the build
stage runs Vite, the runtime stage receives only `dist`, `server.js`, and
production dependencies.
