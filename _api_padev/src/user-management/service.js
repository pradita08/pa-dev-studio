/**
 * Layanan User Management.
 *
 * Dipindahkan dari `user-service.js` dan `user-repository.js` milik
 * `api_bridge_gateway`, dengan aturan-aturannya dipertahankan utuh:
 *
 *  1. Otorisasi HANYA membaca `mst_user_permission`. Role tidak pernah ikut
 *     dihitung saat memutuskan boleh atau tidak.
 *  2. Izin dibaca ulang dari database setiap request, tidak dititipkan ke
 *     token. Mencabut izin berlaku pada request berikutnya.
 *  3. Administrator terakhir dilindungi: tidak boleh ada perubahan yang
 *     menyisakan nol pengguna aktif pemegang izin pengelolaan pengguna.
 *  4. Role hanya template saat pengguna dibuat atau rolenya diganti.
 */
import { getPool } from '../db.js';
import { createScryptHash, verifyScryptHash } from './scrypt.js';

/**
 * Izin yang menentukan "masih ada administrator".
 *
 * Dipilih `adminpanel/users:update` — bukan `:read` — karena kemampuan
 * MENGUBAH pengguna lah yang membuat sistem masih bisa dipulihkan. Pengguna
 * yang cuma bisa melihat daftar tidak dapat mengembalikan akses siapa pun.
 */
export const CRITICAL_PERMISSION = 'adminpanel/padev-users:update';

export class ValidationError extends Error {
  constructor(errors, message = 'Data tidak valid') {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

/* ============================== Pengguna ============================== */

export const findUserByEmail = async (email) => {
  const [rows] = await getPool().query(
    `SELECT u.*, g.MstUserGroupName, g.MstUserGroupSlug
       FROM mst_user u
       LEFT JOIN mst_user_group g ON g.MstUserGroupId = u.MstUserGroupId
      WHERE u.MstUserEmail = ? LIMIT 1`,
    [String(email).trim().toLowerCase()],
  );
  return rows[0] || null;
};

export const permissionKeysOf = async (userId) => {
  const [rows] = await getPool().query(
    `SELECT p.MstPermissionKey
       FROM mst_user_permission up
       JOIN mst_permission p ON p.MstPermissionId = up.MstPermissionId
      WHERE up.MstUserId = ?`,
    [userId],
  );
  return rows.map((r) => r.MstPermissionKey);
};

/**
 * Memuat identitas dan izin pengguna untuk request berjalan.
 *
 * Satu query berindeks per request adalah harga yang dibayar supaya pencabutan
 * izin berlaku seketika, bukan menunggu orangnya kebetulan logout.
 */
export const loadSessionUser = async (userId) => {
  const [rows] = await getPool().query(
    `SELECT u.MstUserId, u.MstUserEmail, u.MstUserFullName, u.MstUserUsername,
            u.MstUserAvatarUrl, u.MstUserStatus,
            u.MstUserGroupId, g.MstUserGroupName, g.MstUserGroupSlug
       FROM mst_user u
       LEFT JOIN mst_user_group g ON g.MstUserGroupId = u.MstUserGroupId
      WHERE u.MstUserId = ? LIMIT 1`,
    [userId],
  );
  const user = rows[0];
  if (!user || user.MstUserStatus !== 'ACTIVE') return null;

  return {
    id: Number(user.MstUserId),
    email: user.MstUserEmail,
    name: user.MstUserFullName,
    username: user.MstUserUsername || null,
    avatarUrl: user.MstUserAvatarUrl || null,
    status: user.MstUserStatus,
    groupId: user.MstUserGroupId === null ? null : Number(user.MstUserGroupId),
    role: user.MstUserGroupName || 'Tanpa role',
    roleSlug: user.MstUserGroupSlug || null,
    permissions: await permissionKeysOf(user.MstUserId),
  };
};

export const authenticate = async (email, password) => {
  const user = await findUserByEmail(email);
  if (!user) return null;
  if (user.MstUserStatus !== 'ACTIVE') return { blocked: true };
  if (!verifyScryptHash(password, user.MstUserPasswordHash)) return null;
  return user;
};

export const touchLogin = (userId) => getPool().query(
  'UPDATE mst_user SET MstUserLastLoginAt = UTC_TIMESTAMP() WHERE MstUserId = ?', [userId],
);

export const listUsers = async ({ search = '', status = '' } = {}) => {
  const where = [];
  const params = [];
  if (status) { where.push('u.MstUserStatus = ?'); params.push(status); }
  if (search) {
    where.push('(u.MstUserEmail LIKE ? OR u.MstUserUsername LIKE ? OR u.MstUserFullName LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await getPool().query(
    `SELECT u.MstUserId AS id, u.MstUserEmail AS email, u.MstUserUsername AS username,
            u.MstUserFullName AS name,
            u.MstUserStatus AS status, u.MstUserLastLoginAt AS last_login_at,
            u.MstUserGroupId AS group_id, g.MstUserGroupName AS role,
            (SELECT COUNT(*) FROM mst_user_permission up WHERE up.MstUserId = u.MstUserId) AS permission_count
       FROM mst_user u
       LEFT JOIN mst_user_group g ON g.MstUserGroupId = u.MstUserGroupId
       ${clause}
      ORDER BY u.MstUserId ASC`,
    params,
  );
  return rows;
};

export const getUser = async (userId) => {
  const [rows] = await getPool().query(
    `SELECT u.MstUserId AS id, u.MstUserEmail AS email, u.MstUserUsername AS username,
            u.MstUserFullName AS name,
            u.MstUserStatus AS status, u.MstUserGroupId AS group_id
       FROM mst_user u WHERE u.MstUserId = ? LIMIT 1`,
    [userId],
  );
  if (!rows[0]) return null;
  return { ...rows[0], permissions: await permissionKeysOf(userId) };
};

/** Jumlah pengguna aktif lain yang masih memegang izin kritis. */
const countOtherActiveAdmins = async (exceptUserId = 0) => {
  const [[baris]] = await getPool().query(
    `SELECT COUNT(DISTINCT u.MstUserId) AS jumlah
       FROM mst_user u
       JOIN mst_user_permission up ON up.MstUserId = u.MstUserId
       JOIN mst_permission p ON p.MstPermissionId = up.MstPermissionId
      WHERE u.MstUserStatus = 'ACTIVE'
        AND p.MstPermissionKey = ?
        AND u.MstUserId <> ?`,
    [CRITICAL_PERMISSION, exceptUserId],
  );
  return Number(baris.jumlah);
};

/**
 * Menjaga agar sistem tidak pernah kehilangan administrator terakhirnya.
 *
 * Diperiksa terhadap KEADAAN SESUDAH perubahan, bukan sebelumnya. Menonaktifkan
 * akun, mencabut izinnya, atau menghapusnya sama-sama melewati pintu ini.
 */
export const assertLastAdministratorRemains = async ({ userId = 0, status, permissionKeys }) => {
  const masihAdmin = status === 'ACTIVE' && permissionKeys.includes(CRITICAL_PERMISSION);
  if (masihAdmin) return;

  if (await countOtherActiveAdmins(userId) === 0) {
    throw new ConflictError(
      `Perubahan ini menyisakan nol pengguna aktif yang memegang izin "${CRITICAL_PERMISSION}". `
      + 'Berikan izin tersebut kepada pengguna lain terlebih dahulu.',
    );
  }
};

const setUserPermissions = async (userId, keys) => {
  const db = getPool();
  await db.query('DELETE FROM mst_user_permission WHERE MstUserId = ?', [userId]);
  if (keys.length === 0) return;
  const [rows] = await db.query(
    `SELECT MstPermissionId FROM mst_permission WHERE MstPermissionKey IN (${keys.map(() => '?').join(',')})`,
    keys,
  );
  for (const r of rows) {
    await db.query('INSERT IGNORE INTO mst_user_permission (MstUserId, MstPermissionId) VALUES (?, ?)', [userId, r.MstPermissionId]);
  }
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Nama masuk opsional.
 *
 * Bentuknya dibatasi karena ia ditampilkan berdampingan dengan email pada
 * daftar pengguna: spasi dan tanda baca bebas membuat keduanya sulit dibedakan
 * sekilas. Ia BUKAN kredensial — `authenticate()` tidak pernah membacanya.
 */
const USERNAME = /^[a-z0-9][a-z0-9._-]{2,149}$/;

/** String kosong dan `null` sama-sama berarti "tidak diisi". */
const normalkanUsername = (nilai) => {
  const bersih = String(nilai ?? '').trim().toLowerCase();
  return bersih === '' ? null : bersih;
};

export const findUserByUsername = async (username) => {
  const [rows] = await getPool().query(
    'SELECT MstUserId FROM mst_user WHERE MstUserUsername = ? LIMIT 1', [username],
  );
  return rows[0] || null;
};

const validateUser = ({ email, name, password, username }, { requirePassword }) => {
  const errors = {};
  if (!EMAIL.test(String(email || ''))) errors.email = 'Alamat email tidak valid.';
  if (!String(name || '').trim()) errors.name = 'Nama wajib diisi.';
  const namaMasuk = normalkanUsername(username);
  if (namaMasuk !== null && !USERNAME.test(namaMasuk)) {
    errors.username = 'Nama masuk hanya boleh huruf kecil, angka, titik, garis bawah, dan tanda hubung; minimal 3 karakter.';
  }
  if (requirePassword || password) {
    if (String(password || '').length < 10) errors.password = 'Kata sandi minimal 10 karakter.';
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
};

export const createUser = async (data, aktor) => {
  validateUser(data, { requirePassword: true });
  const email = String(data.email).trim().toLowerCase();

  if (await findUserByEmail(email)) throw new ValidationError({ email: 'Email ini sudah terdaftar.' });

  const username = normalkanUsername(data.username);
  if (username && await findUserByUsername(username)) {
    throw new ValidationError({ username: 'Nama masuk ini sudah dipakai.' });
  }

  const [hasil] = await getPool().query(
    `INSERT INTO mst_user
       (MstUserEmail, MstUserUsername, MstUserFullName, MstUserPasswordHash, MstUserStatus,
        MstUserGroupId, MstUserCreatedBy)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      email, username, String(data.name).trim(), createScryptHash(String(data.password)),
      data.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
      data.group_id ? Number(data.group_id) : null, aktor,
    ],
  );

  // Izin awal: kiriman eksplisit kalau ada, kalau tidak centang bawaan role.
  // Sesudah titik ini, role tidak pernah lagi menentukan apa pun.
  //
  // Yang dipakai adalah `defaultKeysOfGroup`, BUKAN template mentahnya —
  // sama persis dengan yang ditawarkan formulir. PADF-UM-001 pasal 6:
  // jalur API tidak boleh punya bawaan yang berbeda dari jalur formulir.
  // Sebelumnya di sini template mentah yang dipakai, sehingga membuat
  // pengguna lewat API dengan role yang templatenya kebetulan membawa izin
  // baca User Management akan memberikannya diam-diam.
  const keys = Array.isArray(data.permissions)
    ? data.permissions
    : await defaultKeysOfGroup(data.group_id);
  await setUserPermissions(hasil.insertId, keys);

  return getUser(hasil.insertId);
};

export const updateUser = async (userId, data, aktor) => {
  const lama = await getUser(userId);
  if (!lama) return null;
  validateUser({ ...lama, ...data }, { requirePassword: false });

  const email = data.email ? String(data.email).trim().toLowerCase() : lama.email;
  if (email !== lama.email) {
    const bentrok = await findUserByEmail(email);
    if (bentrok) throw new ValidationError({ email: 'Email ini sudah terdaftar.' });
  }

  // Field yang tidak dikirim tetap seperti semula: sunting sebagian tidak
  // boleh diam-diam mengosongkan nama masuk yang sudah ada.
  const username = data.username === undefined ? lama.username : normalkanUsername(data.username);
  if (username && username !== lama.username && await findUserByUsername(username)) {
    throw new ValidationError({ username: 'Nama masuk ini sudah dipakai.' });
  }

  const status = data.status === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
  const keys = Array.isArray(data.permissions) ? data.permissions : lama.permissions;

  // Diperiksa SEBELUM menulis, terhadap keadaan sesudah perubahan.
  await assertLastAdministratorRemains({ userId, status, permissionKeys: keys });

  const kolom = [
    'MstUserEmail = ?', 'MstUserUsername = ?', 'MstUserFullName = ?', 'MstUserStatus = ?',
    'MstUserGroupId = ?', 'MstUserUpdatedBy = ?',
  ];
  const nilai = [
    email, username, String(data.name ?? lama.name).trim(), status,
    data.group_id ? Number(data.group_id) : null, aktor,
  ];

  if (data.password) {
    validateUser({ ...lama, password: data.password }, { requirePassword: true });
    kolom.push('MstUserPasswordHash = ?');
    nilai.push(createScryptHash(String(data.password)));
  }

  await getPool().query(`UPDATE mst_user SET ${kolom.join(', ')} WHERE MstUserId = ?`, [...nilai, userId]);
  if (Array.isArray(data.permissions)) await setUserPermissions(userId, keys);

  return getUser(userId);
};

export const deleteUser = async (userId) => {
  const user = await getUser(userId);
  if (!user) return false;
  // Menghapus sama saja dengan menyisakan nol izin pada pengguna ini.
  await assertLastAdministratorRemains({ userId, status: 'DISABLED', permissionKeys: [] });
  await getPool().query('DELETE FROM mst_user WHERE MstUserId = ?', [userId]);
  return true;
};

/**
 * Menyunting identitas milik sesi yang berjalan.
 *
 * Sengaja BUKAN `updateUser`: yang boleh disentuh pemiliknya sendiri hanya
 * nama dan email. Role, status, dan izin tidak ikut, karena akun yang bisa
 * menaikkan izinnya sendiri membuat seluruh model izin kehilangan artinya.
 *
 * Kata sandi juga tidak pernah tersentuh di sini — penggantiannya adalah niat
 * terpisah lewat `changeOwnPassword` (PADF-UM-001 pasal 5).
 */
export const updateOwnProfile = async (userId, { name, email }) => {
  const lama = await getUser(userId);
  if (!lama) return null;

  const emailBaru = email === undefined ? lama.email : String(email).trim().toLowerCase();
  const namaBaru = name === undefined ? lama.name : String(name).trim();
  validateUser({ ...lama, name: namaBaru, email: emailBaru }, { requirePassword: false });

  if (emailBaru !== lama.email && await findUserByEmail(emailBaru)) {
    throw new ValidationError({ email: 'Email ini sudah terdaftar.' });
  }

  await getPool().query(
    'UPDATE mst_user SET MstUserFullName = ?, MstUserEmail = ?, MstUserUpdatedBy = ? WHERE MstUserId = ?',
    [namaBaru, emailBaru, lama.email, userId],
  );
  return getUser(userId);
};

/**
 * Menyimpan URL foto profil dan mengembalikan URL lama supaya pemanggilnya
 * bisa menghapus berkas yang tidak lagi dirujuk siapa pun.
 */
export const setOwnAvatar = async (userId, url) => {
  const [rows] = await getPool().query(
    'SELECT MstUserAvatarUrl FROM mst_user WHERE MstUserId = ?',
    [userId],
  );
  if (!rows[0]) return null;
  await getPool().query('UPDATE mst_user SET MstUserAvatarUrl = ? WHERE MstUserId = ?', [url, userId]);
  return { sebelumnya: rows[0].MstUserAvatarUrl || null, sekarang: url };
};

export const changeOwnPassword = async (userId, { current, next }) => {
  const [rows] = await getPool().query('SELECT MstUserPasswordHash FROM mst_user WHERE MstUserId = ?', [userId]);
  if (!rows[0]) return false;
  if (!verifyScryptHash(String(current || ''), rows[0].MstUserPasswordHash)) {
    throw new ValidationError({ current: 'Kata sandi saat ini tidak cocok.' });
  }
  if (String(next || '').length < 10) throw new ValidationError({ next: 'Kata sandi baru minimal 10 karakter.' });
  await getPool().query(
    'UPDATE mst_user SET MstUserPasswordHash = ? WHERE MstUserId = ?',
    [createScryptHash(String(next)), userId],
  );
  return true;
};

/* ================================ Role ================================ */

export const templateKeysOfGroup = async (groupId) => {
  if (!groupId) return [];
  const [rows] = await getPool().query(
    `SELECT p.MstPermissionKey
       FROM mst_user_group_permission gp
       JOIN mst_permission p ON p.MstPermissionId = gp.MstPermissionId
      WHERE gp.MstUserGroupId = ?`,
    [groupId],
  );
  return rows.map((r) => r.MstPermissionKey);
};

/**
 * Centang bawaan sebuah role: templatenya, dikurangi izin User Management.
 *
 * PADF-UM-001 pasal 3 — aktivasi bawaan TIDAK PERNAH mencakup pengelolaan
 * pengguna, apa pun isi template role-nya. Template boleh saja memuatnya
 * (misalnya role "Viewer" yang templatenya seluruh izin baca), tetapi yang
 * disodorkan sebagai centang awal harus tetap bersih: yang memberi kewenangan
 * mengelola akun harus manusia, secara sadar.
 *
 * Satu-satunya sumber bawaan untuk SELURUH jalur — formulir, AJAX, dan
 * pembuatan lewat API. Menghitungnya di dua tempat berarti keduanya akan
 * pelan-pelan berbeda, dan yang berbeda diam-diam di sini adalah kewenangan.
 */
export const defaultKeysOfGroup = async (groupId) => {
  const template = await templateKeysOfGroup(groupId);
  if (template.length === 0) return [];
  const [rows] = await getPool().query(
    `SELECT MstPermissionKey FROM mst_permission
      WHERE MstPermissionIsUserManagement = 1`,
  );
  const um = new Set(rows.map((r) => r.MstPermissionKey));
  return template.filter((key) => !um.has(key));
};

export const listGroups = async () => {
  const [rows] = await getPool().query(
    `SELECT g.MstUserGroupId AS id, g.MstUserGroupSlug AS slug, g.MstUserGroupName AS name,
            g.MstUserGroupDescription AS description, g.MstUserGroupIsSystem AS is_system,
            (SELECT COUNT(*) FROM mst_user u WHERE u.MstUserGroupId = g.MstUserGroupId) AS member_count,
            (SELECT COUNT(*) FROM mst_user_group_permission gp WHERE gp.MstUserGroupId = g.MstUserGroupId) AS permission_count
       FROM mst_user_group g ORDER BY g.MstUserGroupId ASC`,
  );
  return rows;
};

export const getGroup = async (groupId) => {
  const [rows] = await getPool().query(
    `SELECT MstUserGroupId AS id, MstUserGroupSlug AS slug, MstUserGroupName AS name,
            MstUserGroupDescription AS description, MstUserGroupIsSystem AS is_system
       FROM mst_user_group WHERE MstUserGroupId = ? LIMIT 1`,
    [groupId],
  );
  if (!rows[0]) return null;
  return { ...rows[0], permissions: await templateKeysOfGroup(groupId) };
};

const setGroupPermissions = async (groupId, keys) => {
  const db = getPool();
  await db.query('DELETE FROM mst_user_group_permission WHERE MstUserGroupId = ?', [groupId]);
  if (!keys.length) return;
  const [rows] = await db.query(
    `SELECT MstPermissionId FROM mst_permission WHERE MstPermissionKey IN (${keys.map(() => '?').join(',')})`,
    keys,
  );
  for (const r of rows) {
    await db.query('INSERT IGNORE INTO mst_user_group_permission (MstUserGroupId, MstPermissionId) VALUES (?, ?)', [groupId, r.MstPermissionId]);
  }
};

const slugify = (v) => String(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);

export const createGroup = async (data) => {
  const name = String(data.name || '').trim();
  if (!name) throw new ValidationError({ name: 'Nama role wajib diisi.' });
  const slug = slugify(data.slug || name);

  const [[ada]] = await getPool().query('SELECT COUNT(*) AS n FROM mst_user_group WHERE MstUserGroupSlug = ?', [slug]);
  if (ada.n > 0) throw new ValidationError({ slug: 'Slug role ini sudah dipakai.' });

  const [hasil] = await getPool().query(
    'INSERT INTO mst_user_group (MstUserGroupSlug, MstUserGroupName, MstUserGroupDescription) VALUES (?, ?, ?)',
    [slug, name, data.description || null],
  );
  await setGroupPermissions(hasil.insertId, Array.isArray(data.permissions) ? data.permissions : []);
  return getGroup(hasil.insertId);
};

export const updateGroup = async (groupId, data) => {
  const lama = await getGroup(groupId);
  if (!lama) return null;
  const name = String(data.name ?? lama.name).trim();
  if (!name) throw new ValidationError({ name: 'Nama role wajib diisi.' });

  await getPool().query(
    'UPDATE mst_user_group SET MstUserGroupName = ?, MstUserGroupDescription = ? WHERE MstUserGroupId = ?',
    [name, data.description ?? lama.description, groupId],
  );
  // Mengubah template TIDAK menyentuh izin pengguna mana pun — itulah sebabnya
  // tidak ada pemeriksaan administrator terakhir di sini.
  if (Array.isArray(data.permissions)) await setGroupPermissions(groupId, data.permissions);
  return getGroup(groupId);
};

export const deleteGroup = async (groupId) => {
  const group = await getGroup(groupId);
  if (!group) return false;
  if (group.is_system) throw new ConflictError('Role bawaan sistem tidak dapat dihapus.');
  // Pengguna tidak ikut terhapus: relasi memakai ON DELETE SET NULL, dan izin
  // mereka tetap utuh karena tidak pernah bergantung pada role.
  await getPool().query('DELETE FROM mst_user_group WHERE MstUserGroupId = ?', [groupId]);
  return true;
};

/* ================================ Izin ================================ */

export const permissionCatalog = async () => {
  const [rows] = await getPool().query(
    `SELECT MstPermissionKey AS \`key\`, MstPermissionResource AS resource,
            MstPermissionAction AS action, MstPermissionLabel AS label,
            MstPermissionGroupLabel AS group_label,
            MstPermissionIsUserManagement AS is_user_management
       FROM mst_permission
      WHERE MstPermissionObsoleteAt IS NULL
      ORDER BY MstPermissionGroupLabel, MstPermissionResource, MstPermissionId`,
  );
  return rows;
};
