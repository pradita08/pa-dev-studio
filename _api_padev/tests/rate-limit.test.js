import test from 'node:test';
import assert from 'node:assert/strict';
import { AttemptLimiter } from '../src/rate-limit.js';

test('memblokir setelah batas percobaan tercapai', () => {
  const limiter = new AttemptLimiter({ maxAttempts: 3, windowSeconds: 900 });
  const key = '10.0.0.1|admin@padev.test';

  for (let i = 0; i < 3; i += 1) {
    assert.equal(limiter.check(key).blocked, false);
    limiter.fail(key);
  }

  const result = limiter.check(key);
  assert.equal(result.blocked, true);
  assert.ok(result.retryAfterSeconds > 0);
});

test('login berhasil menghapus hitungan gagal', () => {
  const limiter = new AttemptLimiter({ maxAttempts: 2, windowSeconds: 900 });
  const key = '10.0.0.2|admin@padev.test';

  limiter.fail(key);
  limiter.fail(key);
  assert.equal(limiter.check(key).blocked, true);

  limiter.succeed(key);
  assert.equal(limiter.check(key).blocked, false);
});

test('hitungan dilupakan setelah jendela waktu lewat', () => {
  const limiter = new AttemptLimiter({ maxAttempts: 1, windowSeconds: 0 });
  const key = '10.0.0.3|admin@padev.test';

  limiter.fail(key);
  assert.equal(limiter.check(key).blocked, false);
});

test('kunci berbeda dihitung terpisah', () => {
  const limiter = new AttemptLimiter({ maxAttempts: 1, windowSeconds: 900 });

  limiter.fail('10.0.0.4|a@padev.test');
  assert.equal(limiter.check('10.0.0.4|a@padev.test').blocked, true);
  assert.equal(limiter.check('10.0.0.4|b@padev.test').blocked, false);
});
