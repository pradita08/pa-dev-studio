import assert from 'node:assert/strict';
import test from 'node:test';
import { PublicValidationError, hashPublicTokenForTest, validatePublicRegistration } from '../src/public-auth/service.js';

test('register akun publik menormalisasi email dan tidak meminta tabel admin', () => {
  const result = validatePublicRegistration({
    name: 'Pengunjung PA DEV',
    email: '  Visitor@Example.com ',
    password: 'password-publik-aman',
    passwordConfirmation: 'password-publik-aman',
  });
  assert.deepEqual(result, {
    name: 'Pengunjung PA DEV',
    email: 'visitor@example.com',
    password: 'password-publik-aman',
  });
});

test('validasi akun publik menolak email, password, dan konfirmasi yang salah', () => {
  assert.throws(
    () => validatePublicRegistration({ name: '', email: 'bukan-email', password: 'pendek', passwordConfirmation: 'beda' }),
    (error) => error instanceof PublicValidationError
      && Object.keys(error.errors).sort().join(',') === 'email,name,password,passwordConfirmation',
  );
});

test('token sesi publik disimpan sebagai hash satu arah', () => {
  const token = 'token-publik-uji';
  const hash = hashPublicTokenForTest(token);
  assert.equal(hash.length, 64);
  assert.notEqual(hash, token);
  assert.equal(hashPublicTokenForTest(token), hash);
});

