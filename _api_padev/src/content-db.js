/**
 * Skema dan akses data untuk konten landing yang dikelola dari admin.
 *
 * Empat modul, semuanya berawalan `padev_` seperti tabel autentikasi, supaya
 * tidak pernah bertabrakan dengan skema legacy CodeIgniter di database yang
 * sama.
 *
 * Setiap modul visual menyimpan DUA gambar — `image_light` dan `image_dark`.
 * Ini bukan hiasan: landing memakai komponen `ThemeImage` yang merender kedua
 * berkas dan menyembunyikan salah satunya lewat CSS, jadi satu gambar saja
 * akan pecah di salah satu mode. Aturan pasangan ini ditegakkan di lapisan
 * validasi, bukan diserahkan ke kebiasaan pengisi konten.
 */
import { getPool } from './db.js';

export const migrateContent = async () => {
  const db = getPool();

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_articles (
      id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug         VARCHAR(190)    NOT NULL,
      category     VARCHAR(80)     NOT NULL,
      title        VARCHAR(190)    NOT NULL,
      excerpt      VARCHAR(500)    NULL,
      body         MEDIUMTEXT      NULL,
      image_light  VARCHAR(255)    NULL,
      image_dark   VARCHAR(255)    NULL,
      status       VARCHAR(20)     NOT NULL DEFAULT 'draft',
      published_at DATETIME        NULL,
      position     INT             NOT NULL DEFAULT 0,
      created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_padev_articles_slug (slug),
      KEY idx_padev_articles_status (status, published_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_projects (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug        VARCHAR(190)    NOT NULL,
      tag         VARCHAR(80)     NOT NULL,
      title       VARCHAR(190)    NOT NULL,
      summary     VARCHAR(500)    NULL,
      stack       VARCHAR(255)    NULL,
      url         VARCHAR(255)    NULL,
      image_light VARCHAR(255)    NULL,
      image_dark  VARCHAR(255)    NULL,
      status      VARCHAR(20)     NOT NULL DEFAULT 'draft',
      position    INT             NOT NULL DEFAULT 0,
      created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_padev_projects_slug (slug),
      KEY idx_padev_projects_status (status, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Harga disimpan sebagai bilangan bulat sen, bukan desimal atau teks:
  // "$49" tidak bisa dijumlahkan, dan pecahan biner tidak boleh dipakai untuk
  // uang. Format tampilan diputuskan saat render, bukan saat menyimpan.
  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_templates (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug        VARCHAR(190)    NOT NULL,
      title       VARCHAR(190)    NOT NULL,
      type        VARCHAR(80)     NOT NULL,
      stack       VARCHAR(255)    NULL,
      price_cents INT UNSIGNED    NOT NULL DEFAULT 0,
      currency    VARCHAR(3)      NOT NULL DEFAULT 'USD',
      url         VARCHAR(255)    NULL,
      image_light VARCHAR(255)    NULL,
      image_dark  VARCHAR(255)    NULL,
      status      VARCHAR(20)     NOT NULL DEFAULT 'draft',
      position    INT             NOT NULL DEFAULT 0,
      created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_padev_templates_slug (slug),
      KEY idx_padev_templates_status (status, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Inquiry datang dari pengunjung anonim, jadi tidak ada relasi ke pengguna.
  // `ip_address` dan `user_agent` disimpan untuk menelusuri spam.
  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_inquiries (
      id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name       VARCHAR(120)    NOT NULL,
      email      VARCHAR(190)    NOT NULL,
      service    VARCHAR(120)    NULL,
      message    TEXT            NOT NULL,
      status     VARCHAR(20)     NOT NULL DEFAULT 'new',
      note       VARCHAR(500)    NULL,
      ip_address VARCHAR(45)     NULL,
      user_agent VARCHAR(255)    NULL,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_padev_inquiries_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
};

/* ============================ Query generik ============================
 * Nama tabel dan kolom TIDAK BOLEH datang dari request. Keduanya selalu
 * diambil dari definisi modul di `content-modules.js`, sementara nilai tetap
 * lewat placeholder. Tanpa aturan ini, CRUD generik berubah jadi lubang SQL
 * injection. */

export const listRows = async (table, { search, searchColumns = [], status, orderBy = 'position ASC, id DESC', limit = 100, offset = 0 }) => {
  const where = [];
  const params = [];

  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (search && searchColumns.length > 0) {
    where.push(`(${searchColumns.map((column) => `${column} LIKE ?`).join(' OR ')})`);
    searchColumns.forEach(() => params.push(`%${search}%`));
  }

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await getPool().query(
    `SELECT * FROM ${table} ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
    [...params, Number(limit), Number(offset)],
  );
  const [[{ total }]] = await getPool().query(`SELECT COUNT(*) AS total FROM ${table} ${clause}`, params);
  return { rows, total };
};

export const findRow = async (table, id) => {
  const [rows] = await getPool().query(`SELECT * FROM ${table} WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
};

export const insertRow = async (table, data) => {
  const columns = Object.keys(data);
  const [result] = await getPool().query(
    `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
    Object.values(data),
  );
  return result.insertId;
};

export const updateRow = async (table, id, data) => {
  const columns = Object.keys(data);
  if (columns.length === 0) return 0;
  const [result] = await getPool().query(
    `UPDATE ${table} SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ?`,
    [...Object.values(data), id],
  );
  return result.affectedRows;
};

export const deleteRow = async (table, id) => {
  const [result] = await getPool().query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return result.affectedRows;
};

export const slugTaken = async (table, slug, exceptId = 0) => {
  const [rows] = await getPool().query(
    `SELECT id FROM ${table} WHERE slug = ? AND id <> ? LIMIT 1`,
    [slug, exceptId],
  );
  return rows.length > 0;
};

export const countByStatus = async (table) => {
  const [rows] = await getPool().query(`SELECT status, COUNT(*) AS jumlah FROM ${table} GROUP BY status`);
  return Object.fromEntries(rows.map((row) => [row.status, Number(row.jumlah)]));
};
