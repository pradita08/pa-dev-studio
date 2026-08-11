/**
 * Titik masuk API PA DEV STUDIO.
 *
 * Urutan naik dipilih supaya tidak pernah ada keadaan setengah jadi:
 *
 *   1. tunggu database siap
 *   2. skema User Management  — `mst_user` harus ada sebelum apa pun
 *   3. katalog izin, role, menu
 *   4. administrator bootstrap — supaya selalu ada satu cara masuk
 *   5. tabel sesi            — kuncinya menunjuk `mst_user`
 *   6. pensiunkan `padev_users` — hanya setelah ada akun aktif yang baru
 *   7. skema konten
 *
 * Semua dijalankan sebelum port dibuka, sehingga tidak ada request yang
 * mendarat di tabel yang belum ada.
 */
import { createApp } from './src/app.js';
import { config } from './src/config.js';
import { migrateSessions, purgeExpiredRefreshTokens, retireLegacyUsers, waitForDatabase } from './src/db.js';
import { migrateContent } from './src/content-db.js';
import { migrateUserManagement, seedBootstrapAdmin, seedUserManagement } from './src/user-management/schema.js';
import { rebaseLegacyRegistry } from './src/user-management/rebase.js';
import { migratePublicAuth } from './src/public-auth/schema.js';
import { purgePublicAuthArtifacts } from './src/public-auth/service.js';

const start = async () => {
  await waitForDatabase();

  await migrateUserManagement();
  // Sekali jalan: memindahkan registry lama ke penamaan izin turunan tanpa
  // menghilangkan grant. Tidak melakukan apa pun bila sudah ter-rebase.
  const pulihkanGrant = await rebaseLegacyRegistry();
  await seedUserManagement();
  if (pulihkanGrant) await pulihkanGrant();
  await seedBootstrapAdmin(config.seed);

  await migrateSessions();
  await migratePublicAuth();
  await retireLegacyUsers();
  await migrateContent();
  await purgeExpiredRefreshTokens().catch(() => null);
  await purgePublicAuthArtifacts().catch(() => null);

  const server = createApp().listen(config.port, '0.0.0.0', () => {
    console.log(`PA DEV API listening on port ${config.port}`);
  });

  const stop = (signal) => {
    console.log(`[api] ${signal} diterima, menutup server`);
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', () => stop('SIGTERM'));
  process.on('SIGINT', () => stop('SIGINT'));
};

start().catch((error) => {
  console.error('[api] gagal start:', error);
  process.exit(1);
});
