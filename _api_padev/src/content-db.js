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

  // Harga baru disimpan sebagai satuan penuh mata uangnya. Kolom `price_cents`
  // tetap ada sebagai jejak data lama dan dipindahkan sekali saat upgrade.
  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_templates (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug        VARCHAR(190)    NOT NULL,
      title       VARCHAR(190)    NOT NULL,
      type        VARCHAR(80)     NOT NULL,
      stack       VARCHAR(255)    NULL,
      price_cents INT UNSIGNED    NOT NULL DEFAULT 0,
      price_amount INT UNSIGNED   NOT NULL DEFAULT 0,
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
  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_testimonials (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      author_name VARCHAR(120)    NOT NULL,
      author_role VARCHAR(120)    NULL,
      company     VARCHAR(120)    NULL,
      quote       VARCHAR(800)    NOT NULL,
      rating      TINYINT UNSIGNED NOT NULL DEFAULT 5,
      avatar      VARCHAR(255)    NULL,
      status      VARCHAR(20)     NOT NULL DEFAULT 'draft',
      position    INT             NOT NULL DEFAULT 0,
      created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_padev_testimonials_status (status, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Perusahaan yang dipercaya ditampilkan sebagai daftar tautan sederhana di
  // landing. URL disimpan sebagai data, bukan dirangkai dari nama, sehingga
  // operator dapat mengarahkan setiap logo/nama ke situs resminya sendiri.
  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_companies (
      id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      name       VARCHAR(190)    NOT NULL,
      url        VARCHAR(255)    NOT NULL,
      status     VARCHAR(20)     NOT NULL DEFAULT 'draft',
      position   INT             NOT NULL DEFAULT 0,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_padev_companies_status (status, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_faq (
      id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      question   VARCHAR(255)    NOT NULL,
      answer     MEDIUMTEXT      NOT NULL,
      category   VARCHAR(80)     NULL,
      status     VARCHAR(20)     NOT NULL DEFAULT 'draft',
      position   INT             NOT NULL DEFAULT 0,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_padev_faq_status (status, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_services (
      id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      slug          VARCHAR(190)    NOT NULL,
      title         VARCHAR(190)    NOT NULL,
      tagline       VARCHAR(255)    NULL,
      description   MEDIUMTEXT      NULL,
      deliverables  VARCHAR(500)    NULL,
      price_cents   INT UNSIGNED    NOT NULL DEFAULT 0,
      price_amount  INT UNSIGNED    NOT NULL DEFAULT 0,
      currency      VARCHAR(3)      NOT NULL DEFAULT 'USD',
      image_light   VARCHAR(255)    NULL,
      image_dark    VARCHAR(255)    NULL,
      status        VARCHAR(20)     NOT NULL DEFAULT 'draft',
      position      INT             NOT NULL DEFAULT 0,
      created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_padev_services_slug (slug),
      KEY idx_padev_services_status (status, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  /* Email dibuat UNIQUE di database, bukan hanya diperiksa di aplikasi.
   * Dua permintaan berlangganan yang tiba bersamaan lolos dari pemeriksaan
   * "sudah ada atau belum" mana pun yang dilakukan sebelum menulis. */
  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_subscribers (
      id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      email      VARCHAR(190)    NOT NULL,
      name       VARCHAR(120)    NULL,
      source     VARCHAR(80)     NULL,
      status     VARCHAR(20)     NOT NULL DEFAULT 'active',
      note       VARCHAR(500)    NULL,
      created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_padev_subscribers_email (email),
      KEY idx_padev_subscribers_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  /* Setelan halaman: satu baris per field, bukan satu kolom per field.
   *
   * Halaman Homepage dan Settings tumbuh dan menyusut mengikuti kebutuhan
   * copywriting, dan bentuk baris membuat penambahan field tidak menuntut
   * migrasi tabel. Yang menentukan field apa yang SAH tetap definisi di
   * `settings-modules.js` — baris yang tidak dikenal diabaikan saat dibaca. */
  await db.query(`
    CREATE TABLE IF NOT EXISTS padev_settings (
      id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      group_key  VARCHAR(60)     NOT NULL,
      field_key  VARCHAR(80)     NOT NULL,
      value      MEDIUMTEXT      NULL,
      updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_padev_settings_field (group_key, field_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  /* Harga disimpan dalam SATUAN PENUH mata uangnya, bukan sen.
   *
   * Versi pertama memakai sen mengikuti kebiasaan uang berdesimal. Itu keliru
   * untuk mata uang yang dipakai di sini: rupiah tidak lagi punya sen, dan
   * meminta operator mengetik "250000000" untuk Rp 2.500.000 adalah undangan
   * salah ketik nol yang akibatnya langsung tayang di halaman harga.
   *
   * Nilai lama dibagi seratus sekali jalan supaya harga yang sudah tersimpan
   * tidak berubah artinya. `price_cents` sengaja dibiarkan ada sebagai jejak
   * sampai semua lingkungan ikut, dan tidak lagi dibaca siapa pun.
   */
  const konversi = async (tabel) => {
    const [hasil] = await db.query(
      `UPDATE ${tabel} SET price_amount = FLOOR(price_cents / 100) WHERE price_amount = 0 AND price_cents > 0`,
    );
    if (hasil.affectedRows > 0) console.log(`[konten] ${hasil.affectedRows} harga ${tabel} dipindah dari sen ke satuan penuh`);
  };

  /* Kolom paket harga menyusul belakangan.
   *
   * `padev_services` sudah berisi baris, dan `CREATE TABLE IF NOT EXISTS` di
   * atas tidak pernah menyentuh tabel yang sudah ada — jadi penambahannya
   * ditulis sebagai ALTER berpenjaga, pola yang sama dengan skema User
   * Management.
   *
   * `price_label` ada karena tidak semua paket berupa angka: "Custom" bukan
   * harga yang bisa dijumlahkan, dan memaksakannya ke kolom bilangan akan
   * menampilkannya sebagai 0. */
  const kolomBaru = [
    ['price_amount', 'INT UNSIGNED NOT NULL DEFAULT 0 AFTER price_cents'],
    ['price_label', "VARCHAR(40) NULL AFTER currency"],
    ['price_suffix', "VARCHAR(40) NULL AFTER price_label"],
    ['cta_label', "VARCHAR(60) NULL AFTER price_suffix"],
    ['cta_url', "VARCHAR(255) NULL AFTER cta_label"],
    ['is_featured', "TINYINT(1) NOT NULL DEFAULT 0 AFTER cta_url"],
  ];
  const [[templatePunya]] = await db.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'padev_templates' AND COLUMN_NAME = 'price_amount'`,
  );
  const konversiTemplate = templatePunya.n === 0;
  if (konversiTemplate) {
    await db.query('ALTER TABLE padev_templates ADD COLUMN price_amount INT UNSIGNED NOT NULL DEFAULT 0 AFTER price_cents');
    console.log('[konten] kolom padev_templates.price_amount ditambahkan');
  }

  let konversiLayanan = false;
  for (const [nama, definisi] of kolomBaru) {
    const [[ada]] = await db.query(
      `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'padev_services' AND COLUMN_NAME = ?`,
      [nama],
    );
    if (ada.n === 0) {
      await db.query(`ALTER TABLE padev_services ADD COLUMN ${nama} ${definisi}`);
      console.log(`[konten] kolom padev_services.${nama} ditambahkan`);
      if (nama === 'price_amount') konversiLayanan = true;
    }
  }

  // Jalankan hanya saat kolom pertama kali ditambahkan. Menjalankannya pada
  // setiap boot akan menghidupkan kembali nilai lama jika operator memang
  // sengaja menyetel harga baru menjadi 0.
  if (konversiLayanan) await konversi('padev_services');
  if (konversiTemplate) await konversi('padev_templates');
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

/* ============================ Setelan halaman ============================
 * Bentuk baris (group, field, value), jadi menambah field tidak menuntut
 * migrasi. Yang menentukan field mana yang sah adalah `settings-modules.js`,
 * bukan isi tabel. */

export const readSettings = async (group) => {
  const [rows] = await getPool().query(
    'SELECT field_key, value FROM padev_settings WHERE group_key = ?',
    [group],
  );
  return Object.fromEntries(rows.map((row) => [row.field_key, row.value ?? '']));
};

export const writeSettings = async (group, nilai) => {
  const isian = Object.entries(nilai);
  if (isian.length === 0) return 0;
  for (const [field, value] of isian) {
    await getPool().query(
      `INSERT INTO padev_settings (group_key, field_key, value)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [group, field, value],
    );
  }
  return isian.length;
};
