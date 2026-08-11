/**
 * Skema dan seed User Management.
 *
 * Dipindahkan dari migrasi `004`, `007`, `008`, dan `009` milik
 * `api_bridge_gateway`, digabung menjadi satu karena database ini memulai dari
 * kosong — tidak ada nama izin lama yang perlu dipetakan ulang, dan role
 * `super_admin` yang dihapus migrasi 009 memang tidak pernah ditanam di sini.
 *
 * TIGA HAL YANG SENGAJA DIPISAHKAN (PADF-UM-001):
 *
 *   `mst_permission`             katalog kanonik — daftar izin yang dikenal.
 *   `mst_user_group_permission`  TEMPLATE role — bahan bootstrap saja.
 *   `mst_user_permission`        izin MILIK PENGGUNA — satu-satunya yang
 *                                dibaca saat memutuskan boleh atau tidaknya
 *                                sebuah request.
 *
 * Grup TIDAK PERNAH dibaca saat otorisasi. Mengubah template sebuah role tidak
 * mengubah izin pengguna yang sudah tersimpan; itu keputusan sadar supaya
 * kewenangan seseorang tidak berubah diam-diam karena orang lain menyunting
 * role.
 */
import { getPool } from '../db.js';
import { createScryptHash } from './scrypt.js';
import {
  DEFAULT_MENUS, DEFAULT_ROLES, flattenMenus, menuKey,
  permissionCatalogFromMenus, resolveRolePermissions,
} from './navigation.js';

export const migrateUserManagement = async () => {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS mst_user_group (
      MstUserGroupId          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      MstUserGroupSlug        VARCHAR(80)  NOT NULL UNIQUE,
      MstUserGroupName        VARCHAR(120) NOT NULL,
      MstUserGroupDescription VARCHAR(255) NULL,
      MstUserGroupIsSystem    TINYINT(1)   NOT NULL DEFAULT 0,
      MstUserGroupCreatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      MstUserGroupUpdatedAt   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mst_permission (
      MstPermissionId               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      MstPermissionKey              VARCHAR(150) NOT NULL UNIQUE,
      MstPermissionResource         VARCHAR(120) NOT NULL,
      MstPermissionAction           VARCHAR(20)  NOT NULL,
      MstPermissionLabel            VARCHAR(150) NOT NULL,
      MstPermissionGroupLabel       VARCHAR(120) NOT NULL,
      MstPermissionIsUserManagement TINYINT(1)   NOT NULL DEFAULT 0,
      MstPermissionObsoleteAt       DATETIME     NULL,
      KEY idx_permission_resource (MstPermissionResource)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mst_user (
      MstUserId           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      MstUserEmail        VARCHAR(190) NOT NULL UNIQUE,
      MstUserFullName     VARCHAR(150) NOT NULL,
      MstUserPasswordHash VARCHAR(255) NOT NULL,
      MstUserStatus       ENUM('ACTIVE','DISABLED') NOT NULL DEFAULT 'ACTIVE',
      MstUserGroupId      BIGINT UNSIGNED NULL,
      MstUserLastLoginAt  DATETIME     NULL,
      MstUserCreatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      MstUserUpdatedAt    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      MstUserCreatedBy    VARCHAR(190) NULL,
      MstUserUpdatedBy    VARCHAR(190) NULL,
      CONSTRAINT fk_mst_user_group FOREIGN KEY (MstUserGroupId)
        REFERENCES mst_user_group(MstUserGroupId) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  /* `MstUserUsername` menyusul belakangan.
   *
   * Rujukan `api_bridge_gateway` memakai username sebagai kredensial masuk dan
   * email sebagai kolom opsional. Di sini terbalik: halaman login yang sudah
   * berjalan dan terverifikasi meminta EMAIL, dan membongkarnya berarti
   * membongkar sesi JWT beserta akun bootstrap. Jadi kolomnya diadopsi sebagai
   * nama tampilan opsional — muncul di formulir dan daftar seperti rujukan,
   * tetapi tidak pernah dipakai `authenticate()`.
   *
   * NULL berkali-kali tetap sah pada indeks UNIQUE MySQL, jadi kolom opsional
   * ini tidak menghalangi akun yang memang tidak memakainya.
   *
   * Ditulis sebagai ALTER berpenjaga, bukan diletakkan di `CREATE TABLE` di
   * atas: tabel `mst_user` sudah berisi data, dan `CREATE TABLE IF NOT EXISTS`
   * tidak pernah menyentuh tabel yang sudah ada. */
  const [[kolomUsername]] = await db.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mst_user' AND COLUMN_NAME = 'MstUserUsername'`,
  );
  if (kolomUsername.n === 0) {
    await db.query(
      'ALTER TABLE mst_user ADD COLUMN MstUserUsername VARCHAR(150) NULL UNIQUE AFTER MstUserEmail',
    );
    console.log('[um] kolom mst_user.MstUserUsername ditambahkan');
  }

  /* Foto profil, ditambahkan belakangan dengan penjaga yang sama seperti
   * `MstUserUsername` di atas: `CREATE TABLE IF NOT EXISTS` tidak pernah
   * menyentuh tabel yang sudah berisi data.
   *
   * Yang disimpan hanya URL publik hasil unggahan (`/uploads/...`), bukan
   * berkasnya: berkas hidup di volume Docker supaya tidak ikut hilang setiap
   * kali image dibangun ulang. */
  const [[kolomAvatar]] = await db.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mst_user' AND COLUMN_NAME = 'MstUserAvatarUrl'`,
  );
  if (kolomAvatar.n === 0) {
    await db.query(
      'ALTER TABLE mst_user ADD COLUMN MstUserAvatarUrl VARCHAR(255) NULL AFTER MstUserFullName',
    );
    console.log('[um] kolom mst_user.MstUserAvatarUrl ditambahkan');
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS mst_user_group_permission (
      MstUserGroupId   BIGINT UNSIGNED NOT NULL,
      MstPermissionId  BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (MstUserGroupId, MstPermissionId),
      CONSTRAINT fk_group_permission_group FOREIGN KEY (MstUserGroupId)
        REFERENCES mst_user_group(MstUserGroupId) ON DELETE CASCADE,
      CONSTRAINT fk_group_permission_permission FOREIGN KEY (MstPermissionId)
        REFERENCES mst_permission(MstPermissionId) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mst_user_permission (
      MstUserId       BIGINT UNSIGNED NOT NULL,
      MstPermissionId BIGINT UNSIGNED NOT NULL,
      PRIMARY KEY (MstUserId, MstPermissionId),
      CONSTRAINT fk_user_permission_user FOREIGN KEY (MstUserId)
        REFERENCES mst_user(MstUserId) ON DELETE CASCADE,
      CONSTRAINT fk_user_permission_permission FOREIGN KEY (MstPermissionId)
        REFERENCES mst_permission(MstPermissionId) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS mst_menu (
      MstMenuId        BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      MstMenuKey       VARCHAR(150) NOT NULL UNIQUE,
      MstMenuLabel     VARCHAR(150) NOT NULL,
      MstMenuPath      VARCHAR(190) NULL,
      MstMenuIcon      VARCHAR(500) NULL,
      MstMenuHeading   VARCHAR(120) NULL,
      MstMenuParentId  BIGINT UNSIGNED NULL,
      MstMenuActions   JSON NULL,
      MstMenuOrder     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
      MstMenuEnabled   TINYINT(1) NOT NULL DEFAULT 1,
      MstMenuIsSystem  TINYINT(1) NOT NULL DEFAULT 0,
      MstMenuCreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      MstMenuUpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_mst_menu_parent FOREIGN KEY (MstMenuParentId)
        REFERENCES mst_menu(MstMenuId) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

/**
 * Menanam katalog izin, role bawaan, dan registry menu.
 *
 * Seluruhnya idempoten: dijalankan berulang kali menghasilkan keadaan yang
 * sama. Izin yang SUDAH dipegang pengguna tidak pernah disentuh di sini —
 * seed hanya mengurus katalog dan template.
 */
export const seedUserManagement = async () => {
  const db = getPool();
  const katalog = permissionCatalogFromMenus();

  for (const izin of katalog) {
    await db.query(
      `INSERT INTO mst_permission
         (MstPermissionKey, MstPermissionResource, MstPermissionAction,
          MstPermissionLabel, MstPermissionGroupLabel, MstPermissionIsUserManagement)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         MstPermissionLabel = VALUES(MstPermissionLabel),
         MstPermissionGroupLabel = VALUES(MstPermissionGroupLabel),
         MstPermissionIsUserManagement = VALUES(MstPermissionIsUserManagement),
         MstPermissionObsoleteAt = NULL`,
      [izin.key, izin.resource, izin.action, izin.label, izin.groupLabel, izin.isUserManagement],
    );
  }

  const [barisIzin] = await db.query('SELECT MstPermissionId, MstPermissionKey FROM mst_permission');
  const idIzin = new Map(barisIzin.map((b) => [b.MstPermissionKey, b.MstPermissionId]));

  for (const role of DEFAULT_ROLES) {
    await db.query(
      `INSERT INTO mst_user_group
         (MstUserGroupSlug, MstUserGroupName, MstUserGroupDescription, MstUserGroupIsSystem)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE MstUserGroupName = VALUES(MstUserGroupName)`,
      [role.slug, role.name, role.description],
    );

    const [[baris]] = await db.query(
      'SELECT MstUserGroupId FROM mst_user_group WHERE MstUserGroupSlug = ?', [role.slug],
    );

    // Template ditulis ulang setiap seed supaya mengikuti katalog terbaru.
    // Ini AMAN justru karena template bukan sumber otorisasi: tidak ada
    // pengguna yang kehilangan atau mendapat kewenangan karenanya.
    await db.query('DELETE FROM mst_user_group_permission WHERE MstUserGroupId = ?', [baris.MstUserGroupId]);
    const kunci = resolveRolePermissions(role, katalog);
    for (const k of kunci) {
      if (!idIzin.has(k)) continue;
      await db.query(
        'INSERT IGNORE INTO mst_user_group_permission (MstUserGroupId, MstPermissionId) VALUES (?, ?)',
        [baris.MstUserGroupId, idIzin.get(k)],
      );
    }
  }

  await seedMenus();
};

/**
 * Menanam akun administrator pertama dari environment.
 *
 * PENGECUALIAN BOOTSTRAP YANG DISENGAJA. PADF-UM-001 menetapkan bahwa aktivasi
 * bawaan tidak mencakup User Management — aturan itu berlaku untuk pengguna
 * yang dibuat lewat formulir, dan ditegakkan di endpoint
 * `/permission-template`. Akun pertama ini berbeda: kalau ia tidak memegang
 * izin User Management, tidak akan ada seorang pun yang dapat membuat pengguna
 * kedua, dan sistem terkunci sejak menit pertama.
 *
 * Akun hanya dibuat bila `mst_user` masih kosong. Setelah ada satu pengguna,
 * mengubah `ADMIN_PASSWORD` di environment TIDAK mengubah kata sandi siapa pun
 * — kredensial hidup di database, bukan di berkas konfigurasi.
 */
export const seedBootstrapAdmin = async ({ email, password, name }) => {
  const db = getPool();
  if (!email || !password) {
    console.warn('[um] ADMIN_EMAIL/ADMIN_PASSWORD kosong — bootstrap admin dilewati');
    return;
  }

  const [[jumlah]] = await db.query('SELECT COUNT(*) AS n FROM mst_user');
  if (jumlah.n > 0) return;

  const [[role]] = await db.query(
    'SELECT MstUserGroupId FROM mst_user_group WHERE MstUserGroupSlug = ? LIMIT 1', ['administrator'],
  );

  const [hasil] = await db.query(
    `INSERT INTO mst_user
       (MstUserEmail, MstUserFullName, MstUserPasswordHash, MstUserStatus, MstUserGroupId, MstUserCreatedBy)
     VALUES (?, ?, ?, 'ACTIVE', ?, 'bootstrap')`,
    [String(email).trim().toLowerCase(), name || 'Administrator', createScryptHash(String(password)), role?.MstUserGroupId ?? null],
  );

  await db.query(
    `INSERT IGNORE INTO mst_user_permission (MstUserId, MstPermissionId)
     SELECT ?, MstPermissionId FROM mst_permission WHERE MstPermissionObsoleteAt IS NULL`,
    [hasil.insertId],
  );

  console.log(`[um] administrator bootstrap dibuat: ${email}`);
};

/**
 * Menanam menu bawaan.
 *
 * Menu yang sudah ada TIDAK ditimpa selain label dan ikonnya: urutan, status
 * aktif, dan induknya boleh diatur ulang pemilik dari halaman Menu & Izin, dan
 * seed tidak berhak mengembalikannya.
 */
const seedMenus = async () => {
  const db = getPool();

  // M1: registry adalah data. Benih hanya dipakai saat tabel masih kosong;
  // sesudah itu susunan menu sepenuhnya milik operator, dan seed tidak berhak
  // mengembalikan apa pun yang sudah ia ubah.
  const [[isi]] = await db.query('SELECT COUNT(*) AS n FROM mst_menu');
  if (isi.n > 0) return;
  const datar = flattenMenus(DEFAULT_MENUS);
  const idMenu = new Map();

  // Heading ditulis sebagai penanda pada menu tepat di bawahnya, bukan baris
  // tersendiri, supaya urutan tidak bergantung pada baris kosong.
  const headingUntuk = new Map();
  let headingBerjalan = null;
  for (const entri of DEFAULT_MENUS) {
    if (entri.heading) { headingBerjalan = entri.heading; continue; }
    if (headingBerjalan) { headingUntuk.set(menuKey(entri), headingBerjalan); headingBerjalan = null; }
  }

  let urutan = 0;
  for (const entri of datar) {
    urutan += 10;
    const indukId = entri.parentKey ? idMenu.get(entri.parentKey) ?? null : null;
    const kunci = entri.key || menuKey(entri);
    await db.query(
      `INSERT INTO mst_menu
         (MstMenuKey, MstMenuLabel, MstMenuPath, MstMenuIcon, MstMenuHeading,
          MstMenuParentId, MstMenuActions, MstMenuOrder, MstMenuIsSystem)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)
       ON DUPLICATE KEY UPDATE
         MstMenuLabel = VALUES(MstMenuLabel),
         MstMenuIcon = VALUES(MstMenuIcon),
         MstMenuActions = VALUES(MstMenuActions)`,
      [
        kunci, entri.label, entri.path || null, entri.icon || null,
        headingUntuk.get(kunci) || null, indukId,
        JSON.stringify(entri.actions || []), urutan, entri.isSystem ? 1 : 0,
      ],
    );
    const [[baris]] = await db.query('SELECT MstMenuId FROM mst_menu WHERE MstMenuKey = ?', [kunci]);
    idMenu.set(kunci, baris.MstMenuId);
  }
};
