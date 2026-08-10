/**
 * Akses database dan urutan pemasangan skema.
 *
 * PENTING — database `pa_dev` sudah berisi skema legacy CodeIgniter 4 + Shield
 * (`users`, `auth_identities`, `auth_groups_users`, dan seterusnya) beserta
 * datanya. Skema itu area terproteksi: tidak dibaca, tidak diubah, dan tidak
 * dipakai ulang.
 *
 * Sejak User Management dipindahkan dari `api_bridge_gateway`, akun admin
 * tinggal di `mst_user`, bukan lagi `padev_users`. Tabel lama itu dipensiunkan
 * pada saat migrasi; lihat `retireLegacyUsers()`.
 */
import mysql from 'mysql2/promise';
import { config } from './config.js';

let pool;

export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.db.host,
      port: config.db.port,
      user: config.db.user,
      password: config.db.password,
      database: config.db.database,
      waitForConnections: true,
      connectionLimit: config.db.connectionLimit,
      charset: 'utf8mb4_unicode_ci',
      timezone: 'Z',
    });
  }
  return pool;
};

/** MySQL biasanya masih membuka port sebelum siap menerima query. */
export const waitForDatabase = async ({ retries = 30, delayMs = 2000 } = {}) => {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const connection = await getPool().getConnection();
      await connection.ping();
      connection.release();
      return;
    } catch (error) {
      if (attempt === retries) throw error;
      console.warn(`[db] belum siap (${attempt}/${retries}): ${error.code || error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

/**
 * Tabel sesi refresh token.
 *
 * Dijalankan SETELAH `mst_user` ada, karena kuncinya menunjuk ke sana.
 * Disimpan sebagai `jti`, bukan token utuh: cukup untuk mencabut sesi, dan
 * kalau tabel ini bocor tidak ada token yang bisa dipakai ulang.
 */
export const migrateSessions = async () => {
  const db = getPool();

  // Versi lama tabel ini menunjuk `padev_users`. Kunci asing tidak bisa
  // dialihkan tanpa membongkar tabelnya, dan isinya hanya sesi yang berumur
  // pendek — jadi tabel lama dibuang dan dibuat ulang. Akibatnya semua sesi
  // yang sedang berjalan harus login ulang, sekali saja saat pemutakhiran.
  const [[lama]] = await db.query(
    `SELECT COUNT(*) AS n FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'padev_auth_refresh_tokens'
        AND REFERENCED_TABLE_NAME = 'padev_users'`,
  );
  if (lama.n > 0) {
    await db.query('DROP TABLE padev_auth_refresh_tokens');
    console.log('[db] tabel sesi lama dibuang, akan dibuat ulang menunjuk mst_user');
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_auth_refresh_tokens (
      jti        CHAR(36)        NOT NULL,
      user_id    BIGINT UNSIGNED NOT NULL,
      expires_at DATETIME        NOT NULL,
      revoked_at DATETIME        NULL,
      user_agent VARCHAR(255)    NULL,
      ip_address VARCHAR(45)     NULL,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (jti),
      KEY idx_padev_refresh_user (user_id),
      KEY idx_padev_refresh_expires (expires_at),
      CONSTRAINT fk_padev_refresh_user FOREIGN KEY (user_id)
        REFERENCES mst_user (MstUserId) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

/**
 * Memensiunkan tabel akun lama.
 *
 * Hanya dijalankan setelah ada minimal satu akun di `mst_user`, supaya tidak
 * pernah ada keadaan tanpa satu pun cara masuk.
 */
export const retireLegacyUsers = async () => {
  const db = getPool();
  const [[ada]] = await db.query(
    `SELECT COUNT(*) AS n FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'padev_users'`,
  );
  if (ada.n === 0) return;

  const [[jumlah]] = await db.query('SELECT COUNT(*) AS n FROM mst_user WHERE MstUserStatus = "ACTIVE"');
  if (jumlah.n === 0) {
    console.warn('[db] padev_users dipertahankan: belum ada akun aktif di mst_user');
    return;
  }

  await db.query('DROP TABLE padev_users');
  console.log('[db] padev_users dipensiunkan, akun admin kini di mst_user');
};

export const purgeExpiredRefreshTokens = () => getPool().query(
  'DELETE FROM padev_auth_refresh_tokens WHERE expires_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 DAY)',
);

export const storeRefreshToken = ({ jti, userId, expiresAt, userAgent, ip }) => getPool().query(
  'INSERT INTO padev_auth_refresh_tokens (jti, user_id, expires_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?)',
  [jti, userId, expiresAt, (userAgent || '').slice(0, 255) || null, (ip || '').slice(0, 45) || null],
);

export const findActiveRefreshToken = async (jti) => {
  const [rows] = await getPool().query(
    'SELECT jti, user_id FROM padev_auth_refresh_tokens WHERE jti = ? AND revoked_at IS NULL AND expires_at > UTC_TIMESTAMP() LIMIT 1',
    [jti],
  );
  return rows[0] || null;
};

export const revokeRefreshToken = (jti) => getPool().query(
  'UPDATE padev_auth_refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE jti = ? AND revoked_at IS NULL',
  [jti],
);

export const revokeAllRefreshTokensOf = (userId) => getPool().query(
  'UPDATE padev_auth_refresh_tokens SET revoked_at = UTC_TIMESTAMP() WHERE user_id = ? AND revoked_at IS NULL',
  [userId],
);
