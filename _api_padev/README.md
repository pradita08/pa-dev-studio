# _api_padev — PA DEV STUDIO authentication API

Express + JWT + MySQL. This single process does two jobs: it serves the
authentication API, and it serves the `/auth` (PA DEV Auth) and `/adminpanel`
(PA DEV Admin) pages built from `_app_padev_auth` and `_app_padev_admin`.

Pages and API are combined so that guarding the admin pages uses exactly the
same token verification as the API — there is no second definition of "logged
in" that could drift. The public React homepage stays in the `pa_dev` service
and is not touched from here.

## Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password, remember }` → session cookie + `accessToken` |
| `POST` | `/api/auth/refresh` | Exchange the refresh cookie for a fresh token pair |
| `POST` | `/api/auth/logout` | Revoke the refresh token, clear cookies |
| `GET` | `/api/auth/me` | Profile of the current session's user |
| `GET` | `/api/health` | Service status |

Pages: `GET /auth/` (login) and `GET /adminpanel/*` (dashboard and every admin
theme page, session required).

## Content endpoints

Four modules share one generic route. `:module` may only be `articles`,
`projects`, `templates`, or `inquiries` — table and column names never come
from the request, only from `src/content-modules.js`.

| Method | Path | Access | Description |
|---|---|---|---|
| `GET` | `/api/content/:module` | public | `published` rows only. For the landing page |
| `POST` | `/api/inquiries` | public | Contact form submission, capped at 5 per 15 minutes per IP |
| `GET` | `/api/admin/:module` | session | List + search (`q`) + filter (`status`) |
| `GET` | `/api/admin/:module/:id` | session | A single row |
| `POST` | `/api/admin/:module` | session | Create (except `inquiries`) |
| `PATCH` | `/api/admin/:module/:id` | session | Partial update |
| `DELETE` | `/api/admin/:module/:id` | session | Delete the row along with its images |
| `POST` | `/api/admin/uploads` | session | Upload one image, response carries the URL |

`inquiries` deliberately cannot be created from the admin panel (`405`), and
their message body cannot be edited — only `status` and `note` may change. A
message is evidence from a visitor, not an internal note.

## Image pairing rule

The landing page uses a `ThemeImage` component that renders both the light
**and** the dark file and hides one of them with CSS. A single image therefore
means an empty card in one of the modes, and that only surfaces after
publishing.

So `image_light` and `image_dark` are **required as a pair when status is
`published`**, and the rule is enforced on the server — not just in the admin
form. While still a `draft`, either may be empty so that writing can be done in
stages.

Images are only accepted as URLs produced by `POST /api/admin/uploads`; any
value not starting with `/uploads/` is rejected. SVG is not accepted, because it
can carry script and would be served from the same origin as the admin panel.

Files are stored in the `padev_uploads` volume, not inside the image — baked
into the image, every rebuild would erase every upload.

## Token model

| Token | Lifetime | Location | Revoked via |
|---|---|---|---|
| Access | 15 minutes | `padev_session` httpOnly cookie, or `Authorization: Bearer` header | its own expiry |
| Refresh | 7 days | `padev_refresh` httpOnly cookie | `padev_auth_refresh_tokens.revoked_at` |

Refresh tokens are **rotated**: single-use, with the old one revoked
immediately. A stolen refresh token becomes worthless the moment its rightful
owner uses theirs.

Admin pages are opened by browser navigation, which cannot attach an
`Authorization` header — hence the httpOnly session cookie. When the access
token has expired but the refresh token is still valid, the page middleware
rotates the session silently so nobody is thrown back to the login screen
mid-task.

## Database

Tables owned by this API are prefixed `padev_`:

- `mst_user` — admin accounts owned by the User Management migration
- `padev_auth_refresh_tokens` — admin refresh session `jti`, for revocation
- `padev_public_accounts` — public identities and manual password hashes
- `padev_public_identities` — one provider identity per public account
- `padev_public_sessions` — hashed opaque public session cookies
- `padev_public_oauth_states` — short-lived, one-use OAuth state + PKCE verifier

**The legacy CodeIgniter 4 + Shield schema in the `pa_dev` database (`users`,
`auth_identities`, `auth_groups_users`, and so on) is never read, never
modified, and never reused.** The unprefixed name `users` already belongs to
that legacy system, with an entirely different column shape.

The schema is created when the container comes up (`CREATE TABLE IF NOT
EXISTS`), and the first admin is seeded only when `ADMIN_EMAIL` is not yet
present in `padev_users`. Changing `ADMIN_PASSWORD` in `.env` after the account
exists does **not** change that account's password.

## Configuration

Everything comes from the environment; see `../.env.example`. Two values that
need attention:

- `JWT_SECRET` — at least 32 characters. The process refuses to start under
  `NODE_ENV=production` if it is shorter. Changing it invalidates all sessions.
- `COOKIE_SECURE` — set `true` only once the site is served over HTTPS. Over
  plain HTTP a `Secure` cookie is never sent by the browser, and login fails.

Public account login is intentionally separate from admin login. The UI uses
`/api/public-auth/register`, `/api/public-auth/login`, `/api/public-auth/me`,
and `/api/public-auth/logout`; Google and GitHub use provider-specific `/start`
and `/callback` routes. Populate the `PUBLIC_AUTH_*` variables in the root
`.env` only after registering matching OAuth redirect URIs. Empty provider
credentials return a safe `503` and never fall back to the admin identity.

## Tests

```bash
npm test        # token verification and login throttling
```

The tests need no database.

## Operational note

Login throttling is counted in process memory. That is fine for a single
container; if the API is ever scaled to multiple replicas, the counter needs to
move to shared storage.
