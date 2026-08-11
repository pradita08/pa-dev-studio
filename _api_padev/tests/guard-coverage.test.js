/**
 * M5 — Cakupan penjaga dibuktikan dengan ENUMERASI, bukan pembacaan.
 *
 * Membaca route satu per satu membuktikan keadaan hari ini dan tidak
 * menjanjikan apa pun tentang route yang ditambahkan besok. Test ini menyusuri
 * isi setiap router yang benar-benar dipasang aplikasi, lalu menuntut setiap
 * route yang tidak sengaja dibuka publik melewati middleware penjaga.
 *
 * Menambahkan endpoint baru ke salah satu router tanpa penjaga akan
 * menjatuhkan test ini tanpa ada yang perlu ingat memeriksanya.
 *
 * Prefix mount tidak dibaca dari internal Express: versi 5 tidak lagi
 * mengekspos path mount sebagai string, dan menebaknya lewat regex menghasilkan
 * jalur palsu seperti `//login`. Yang dipetakan di sini hanya TIGA titik pasang
 * di `app.js`; seluruh route di dalamnya tetap terenumerasi.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { authRouter } from '../src/routes/auth.js';
import { publicAuthRouter } from '../src/routes/public-auth.js';
import { contentRouter } from '../src/routes/content.js';
import { userManagementRouter } from '../src/user-management/routes.js';

/** Titik pasang di `app.js`. */
const PASANGAN = [
  ['/api/auth', authRouter],
  ['/api/public-auth', publicAuthRouter],
  ['/api/admin', userManagementRouter],
  ['/api', contentRouter],
];

/**
 * Route yang memang publik.
 *
 * Semuanya identitas atau penyajian, bukan otorisasi: masuk, keluar,
 * menyegarkan sesi, penampung kiriman pengunjung, dan konten yang memang dibaca
 * halaman publik.
 */
const PUBLIK = new Set([
  'POST /api/auth/login',
  'POST /api/auth/refresh',
  'POST /api/auth/logout',
  'GET /api/auth/me',
  'POST /api/public-auth/register',
  'POST /api/public-auth/login',
  'GET /api/public-auth/me',
  'POST /api/public-auth/logout',
  'GET /api/public-auth/:provider/start',
  'GET /api/public-auth/:provider/callback',
  'POST /api/inquiries',
  'POST /api/subscribers',
  'GET /api/content/:module',
  'GET /api/content/settings/:group',
]);

/** Middleware yang dianggap penjaga otorisasi. */
const PENJAGA = new Set(['requireApiAuth', 'requirePermissionGuard', 'requireContentPermission', 'requireSettingsPermission', 'requirePageAuth']);

/** Mengumpulkan route sebuah router beserta middleware yang melewatinya. */
const routeDari = (awalan, router) => {
  const hasil = [];
  const warisan = [];

  for (const layer of router.stack) {
    if (!layer.route) {
      // Middleware tingkat router — berlaku untuk route sesudahnya.
      if (layer.name && layer.name !== '<anonymous>') warisan.push(layer.name);
      continue;
    }
    const jalur = `${awalan}${layer.route.path === '/' ? '' : layer.route.path}`;
    const middleware = [...warisan, ...layer.route.stack.map((s) => s.name)];
    for (const metode of Object.keys(layer.route.methods)) {
      hasil.push({ tanda: `${metode.toUpperCase()} ${jalur}`, middleware });
    }
  }
  return hasil;
};

const semuaRoute = () => PASANGAN.flatMap(([awalan, router]) => routeDari(awalan, router));

test('seluruh route API terenumerasi dari router yang terpasang', () => {
  const route = semuaRoute();
  assert.ok(route.length >= 25, `hanya ${route.length} route terenumerasi — penyusur kemungkinan gagal`);
});

test('setiap route non-publik melewati middleware penjaga', () => {
  const bocor = semuaRoute()
    .filter((r) => !PUBLIK.has(r.tanda))
    .filter((r) => !r.middleware.some((nama) => PENJAGA.has(nama)))
    .map((r) => `${r.tanda}  [${r.middleware.join(', ') || 'tanpa middleware'}]`);

  assert.deepEqual(bocor, [], `route berikut tidak melewati penjaga:\n  ${bocor.join('\n  ')}`);
});

test('tidak ada route admin yang masuk daftar pengecualian publik', () => {
  for (const tanda of PUBLIK) {
    assert.ok(!tanda.includes('/api/admin'), `route admin tidak boleh publik: ${tanda}`);
  }
});

test('setiap route pengubah data di bawah /api/admin menuntut izin, bukan sekadar sesi', () => {
  const tanpaIzin = semuaRoute()
    .filter((r) => r.tanda.includes('/api/admin'))
    .filter((r) => /^(POST|PATCH|PUT|DELETE)/.test(r.tanda))
    // Unggahan menempel pada modul yang memakainya dan dijaga izin create/update
    // di endpoint penyimpanannya. Seluruh `/me` adalah layanan-diri: pengguna
    // hanya dapat mengubah identitas, foto, atau kata sandinya sendiri.
    .filter((r) => !r.tanda.endsWith('/uploads') && !/\/api\/admin\/me(?:\/|$)/.test(r.tanda))
    .filter((r) => !r.middleware.some((n) => ['requirePermissionGuard', 'requireContentPermission', 'requireSettingsPermission'].includes(n)))
    .map((r) => r.tanda);

  assert.deepEqual(tanpaIzin, [], `route berikut hanya menuntut sesi:\n  ${tanpaIzin.join('\n  ')}`);
});
