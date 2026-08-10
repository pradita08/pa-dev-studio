import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken, verifyToken } from '../src/tokens.js';
import { config } from '../src/config.js';

const user = { id: 7, name: 'Alfi Pradita', email: 'admin@padev.test', role: 'admin' };

test('access token membawa identitas dan lolos verifikasi', () => {
  const payload = verifyToken(signAccessToken(user), 'access');
  assert.equal(payload.sub, '7');
  assert.equal(payload.email, 'admin@padev.test');
  assert.equal(payload.role, 'admin');
  assert.equal(payload.typ, 'access');
});

test('refresh token punya jti unik dan masa berlaku di masa depan', () => {
  const first = signRefreshToken(user);
  const second = signRefreshToken(user);
  assert.notEqual(first.jti, second.jti);
  assert.ok(first.expiresAt.getTime() > Date.now());
  assert.equal(verifyToken(first.token, 'refresh').jti, first.jti);
});

test('token ditolak saat tipenya tertukar', () => {
  assert.equal(verifyToken(signAccessToken(user), 'refresh'), null);
  assert.equal(verifyToken(signRefreshToken(user).token, 'access'), null);
});

test('token bertanda tangan rahasia lain ditolak', () => {
  const forged = jwt.sign({ sub: '1', typ: 'access' }, 'rahasia-penyerang', {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: 600,
  });
  assert.equal(verifyToken(forged, 'access'), null);
});

test('token kedaluwarsa ditolak', () => {
  const expired = jwt.sign({ sub: '1', typ: 'access' }, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
    expiresIn: -10,
  });
  assert.equal(verifyToken(expired, 'access'), null);
});

test('token kosong tidak melempar', () => {
  assert.equal(verifyToken('', 'access'), null);
  assert.equal(verifyToken(undefined, 'access'), null);
  assert.equal(verifyToken('bukan.token.jwt', 'access'), null);
});
