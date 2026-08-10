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

  paths: {
    authDist: process.env.AUTH_DIST || path.join(root, 'public', 'auth'),
    adminDist: process.env.ADMIN_DIST || path.join(root, 'public', 'adminpanel'),
    // Volume Docker, bukan bagian image — lihat catatan di `uploads.js`.
    uploads: process.env.UPLOAD_DIR || path.join(root, 'uploads'),
  },
};
