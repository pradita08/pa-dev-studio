/**
 * Penerbitan dan verifikasi JWT.
 *
 * Dua token dengan tugas berbeda:
 *   access  — umur pendek, dibawa setiap request, tidak disimpan di database.
 *   refresh — umur panjang, punya `jti` yang tercatat di database supaya sesi
 *             bisa dicabut saat logout dan dirotasi setiap kali dipakai.
 */
import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from './config.js';

const base = { issuer: config.jwt.issuer, audience: config.jwt.audience };

export const signAccessToken = (user) => jwt.sign(
  { sub: String(user.id), email: user.email, name: user.name, role: user.role, typ: 'access' },
  config.jwt.secret,
  { ...base, expiresIn: config.jwt.accessTtlSeconds },
);

export const signRefreshToken = (user) => {
  const jti = randomUUID();
  const token = jwt.sign(
    { sub: String(user.id), typ: 'refresh' },
    config.jwt.secret,
    { ...base, expiresIn: config.jwt.refreshTtlSeconds, jwtid: jti },
  );
  const expiresAt = new Date(Date.now() + config.jwt.refreshTtlSeconds * 1000);
  return { token, jti, expiresAt };
};

/** Mengembalikan payload, atau null kalau tanda tangan/umur/tipe tidak cocok. */
export const verifyToken = (token, expectedType) => {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwt.secret, base);
    if (payload.typ !== expectedType) return null;
    return payload;
  } catch (_) {
    return null;
  }
};

export const bearerFrom = (request) => {
  const header = request.get('authorization') || '';
  return header.toLowerCase().startsWith('bearer ') ? header.slice(7).trim() : '';
};
