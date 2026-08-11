import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPayload, modules, ValidationError } from '../src/content-modules.js';

test('Company module hanya menerima URL http(s) dan field yang ditentukan', () => {
  assert.equal(modules.companies.table, 'padev_companies');
  assert.deepEqual(buildPayload(modules.companies, {
    name: 'go.id', url: 'https://go.id/', status: 'published', position: '1',
  }), { name: 'go.id', url: 'https://go.id/', status: 'published', position: 1 });
  assert.throws(
    () => buildPayload(modules.companies, { name: 'Unsafe', url: 'javascript:alert(1)', status: 'published' }),
    (error) => Boolean(error instanceof ValidationError && error.errors.url),
  );
});
