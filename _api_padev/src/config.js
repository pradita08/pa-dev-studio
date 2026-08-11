/**
 * Konfigurasi runtime API.
 *
 * Semua nilai berasal dari environment supaya image Docker yang sama bisa
 * dipakai di development dan produksi tanpa rebuild.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const production = process.env.NODE_ENV === 'production';

const number = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const secret = process.env.JWT_SECRET || '';

// Rahasia lemah boleh untuk development, tetapi tidak boleh ikut ke produksi:
// token yang ditandatangani rahasia bawaan bisa dipalsukan siapa saja.
if (production && secret.length < 32) {
  throw new Error('JWT_SECRET wajib diisi minimal 32 karakter saat NODE_ENV=production');
}

export const config = {
  production,
  port: number(process.env.PORT, 4000),

  jwt: {
    secret: secret || 'padev-development-secret-change-me',
    issuer: 'pa-dev-studio',
    audience: 'pa-dev-adminpanel',
    accessTtlSeconds: number(process.env.ACCESS_TOKEN_TTL_SECONDS, 15 * 60),
    refreshTtlSeconds: number(process.env.REFRESH_TOKEN_TTL_SECONDS, 7 * 24 * 60 * 60),
  },

  cookie: {
    access: 'padev_session',
    refresh: 'padev_refresh',
    // Di balik gateway HTTP lokal cookie Secure tidak akan pernah terkirim,
    // jadi flag ini dikendalikan environment, bukan ditebak dari NODE_ENV.
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: 'lax',
  },

  db: {
    host: process.env.DB_HOST || 'mysql',
    port: number(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || 'pa_dev_user',
    password: process.env.DB_PASSWORD || 'pa_dev_password',
    database: process.env.DB_NAME || 'pa_dev',
    connectionLimit: number(process.env.DB_POOL_LIMIT, 10),
  },

  seed: {
    email: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || '',
    name: process.env.ADMIN_NAME || 'Administrator',
  },

  login: {
    maxAttempts: number(process.env.LOGIN_MAX_ATTEMPTS, 8),
    windowSeconds: number(process.env.LOGIN_WINDOW_SECONDS, 15 * 60),
  },

  // Identitas publik sengaja mempunyai namespace, cookie, dan TTL sendiri.
  // Tidak ada nilai di sini yang boleh dipakai ulang oleh auth admin.
  publicAuth: {
    cookieName: process.env.PUBLIC_AUTH_COOKIE_NAME || 'padev_public_session',
    sessionTtlSeconds: number(process.env.PUBLIC_AUTH_SESSION_TTL_SECONDS, 7 * 24 * 60 * 60),
    stateTtlSeconds: number(process.env.PUBLIC_AUTH_STATE_TTL_SECONDS, 10 * 60),
    login: {
      maxAttempts: number(process.env.PUBLIC_AUTH_LOGIN_MAX_ATTEMPTS, 8),
      windowSeconds: number(process.env.PUBLIC_AUTH_LOGIN_WINDOW_SECONDS, 15 * 60),
    },
    frontendSuccessPath: process.env.PUBLIC_AUTH_SUCCESS_PATH || '/',
    frontendFailurePath: process.env.PUBLIC_AUTH_FAILURE_PATH || '/login/?publicAuth=error',
    google: {
      clientId: process.env.PUBLIC_AUTH_GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.PUBLIC_AUTH_GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.PUBLIC_AUTH_GOOGLE_REDIRECT_URI || '',
    },
    github: {
      clientId: process.env.PUBLIC_AUTH_GITHUB_CLIENT_ID || '',
      clientSecret: process.env.PUBLIC_AUTH_GITHUB_CLIENT_SECRET || '',
      redirectUri: process.env.PUBLIC_AUTH_GITHUB_REDIRECT_URI || '',
    },
  },

  paths: {
    authDist: process.env.AUTH_DIST || path.join(root, 'public', 'auth'),
    adminDist: process.env.ADMIN_DIST || path.join(root, 'public', 'adminpanel'),
    // Volume Docker, bukan bagian image — lihat catatan di `uploads.js`.
    uploads: process.env.UPLOAD_DIR || path.join(root, 'uploads'),
  },
};
