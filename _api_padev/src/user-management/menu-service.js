/**
 * Registry menu.
 *
 * Dipindahkan dari `menu-service.js` milik `api_bridge_gateway` beserta batas
 * pentingnya:
 *
 *   MENU ADALAH TAUTAN, BUKAN HALAMAN. Membuat menu tidak pernah membuat
 *   halaman. Karena itu `path` wajib menunjuk berkas admin yang benar-benar
 *   ada — tanpa itu, satu salah ketik menghasilkan menu yang selamanya
 *   berakhir di 404 dan izin yang dibuatnya tidak menjaga apa pun.
 *
 *   MENU TERSEMBUNYI BUKAN OTORISASI. Menyaring sidebar hanya merapikan
 *   tampilan; yang menegakkan tetap middleware izin di setiap endpoint.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getPool } from '../db.js';
import { config } from '../config.js';
import {
  ACTIONS, ACTION_LABELS, isUserManagementResource, menuKey, permissionKey, resourceFromPath,
} from './navigation.js';
import { ConflictError, ValidationError } from './service.js';

/** Memastikan path menu menunjuk berkas halaman yang benar-benar dibangun. */
export const pathTersedia = (menuPath) => {
  if (!menuPath) return true;
  if (!menuPath.startsWith('/adminpanel/')) return false;
  const relatif = menuPath.replace('/adminpanel/', '').split('?')[0].split('#')[0];
  const target = path.resolve(config.paths.adminDist, relatif);
  if (!target.startsWith(path.resolve(config.paths.adminDist) + path.sep)) return false;
  return fs.existsSync(target);
};

/**
 * Halaman admin yang benar-benar terbangun dan boleh ditunjuk sebuah menu.
 *
 * Dibaca dari `dist`, bukan didaftarkan tangan: satu-satunya kebenaran tentang
 * "halaman ini ada" adalah berkasnya sendiri. Halaman formulir dikecualikan —
 * ia bukan tujuan navigasi, dan menunjuknya dari menu akan mencetak katalog
 * izin kedua untuk sumber daya yang sama.
 */
export const daftarPathTersedia = () => {
  const akar = path.resolve(config.paths.adminDist);
  if (!fs.existsSync(akar)) return [];
  return fs.readdirSync(akar)
    .filter((berkas) => berkas.endsWith('.html'))
    .filter((berkas) => !berkas.endsWith('-form.html'))
    .sort()
    .map((berkas) => `/adminpanel/${berkas}`);
};

export const listMenus = async () => {
  const [rows] = await getPool().query(
    `SELECT m.MstMenuId AS id, m.MstMenuKey AS \`key\`, m.MstMenuLabel AS label,
            m.MstMenuPath AS path, m.MstMenuIcon AS icon, m.MstMenuHeading AS heading,
            m.MstMenuParentId AS parent_id, m.MstMenuActions AS actions,
            m.MstMenuOrder AS position, m.MstMenuEnabled AS enabled,
            m.MstMenuIsSystem AS is_system, induk.MstMenuLabel AS parent_label
       FROM mst_menu m
       LEFT JOIN mst_menu induk ON induk.MstMenuId = m.MstMenuParentId
      ORDER BY m.MstMenuOrder ASC, m.MstMenuId ASC`,
  );
  return rows.map((r) => ({ ...r, actions: normalisasiAksi(r.actions) }));
};

const normalisasiAksi = (nilai) => {
  if (Array.isArray(nilai)) return nilai;
  if (!nilai) return [];
  try { return JSON.parse(nilai); } catch (_) { return []; }
};

export const getMenu = async (menuId) => {
  const semua = await listMenus();
  return semua.find((m) => Number(m.id) === Number(menuId)) || null;
};

/**
 * Susunan sidebar untuk seorang pengguna.
 *
 * Menu tampil bila pengguna memegang izin `<key>:read`. Grup pembungkus tampil
 * bila ada minimal satu anaknya yang tampil — grup kosong hanya jadi tombol
 * yang tidak menuju ke mana pun.
 */
/**
 * M9 — Halaman pertama yang benar-benar boleh dibuka pengguna.
 *
 * Mengarahkan semua orang ke dashboard tetap akan menyambut sebagian dari
 * mereka dengan penolakan. Pendaratan diambil dari menu miliknya sendiri.
 */
export const landingPathFor = async (permissions) => {
  const pohon = await menuTreeFor(permissions);
  for (const entri of pohon) {
    if (entri.path) return entri.path;
    const anak = (entri.items || []).find((i) => i.path);
    if (anak) return anak.path;
  }
  return null;
};

export const menuTreeFor = async (permissions) => {
  const semua = (await listMenus()).filter((m) => m.enabled);
  // Menu tanpa aksi tidak dijaga izin apa pun — itu halaman layanan-diri
  // seperti profil, yang termasuk identitas dan bukan otorisasi.
  const boleh = (menu) => !menu.path
    || (menu.actions || []).length === 0
    || permissions.includes(`${menu.key}:read`);

  const anakDari = (indukId) => semua
    .filter((m) => Number(m.parent_id || 0) === Number(indukId))
    .filter(boleh)
    .map((m) => ({ key: m.key, label: m.label, path: m.path }));

  const hasil = [];
  for (const menu of semua.filter((m) => !m.parent_id)) {
    const anak = anakDari(menu.id);
    const punyaAnak = semua.some((m) => Number(m.parent_id || 0) === Number(menu.id));

    if (punyaAnak && anak.length === 0) continue;
    if (!punyaAnak && !boleh(menu)) continue;

    if (menu.heading) hasil.push({ heading: menu.heading });
    hasil.push(punyaAnak
      ? { key: menu.key, label: menu.label, icon: menu.icon, items: anak }
      : { key: menu.key, label: menu.label, icon: menu.icon, path: menu.path });
  }
  return hasil;
};

/** Menyelaraskan katalog izin dengan aksi sebuah menu. */
const sinkronkanIzin = async (menu) => {
  const db = getPool();
  const aksi = (menu.actions || []).filter((a) => ACTIONS.includes(a));

  // M7: entri tanpa halaman tidak menghasilkan izin apa pun.
  if (!menu.path) return;
  const sumber = resourceFromPath(menu.path);

  for (const a of aksi) {
    await db.query(
      `INSERT INTO mst_permission
         (MstPermissionKey, MstPermissionResource, MstPermissionAction,
          MstPermissionLabel, MstPermissionGroupLabel, MstPermissionIsUserManagement)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         MstPermissionLabel = VALUES(MstPermissionLabel),
         MstPermissionGroupLabel = VALUES(MstPermissionGroupLabel)`,
      [
        permissionKey(menu.path, a), sumber, a,
        `${ACTION_LABELS[a]} ${menu.label}`, menu.label,
        isUserManagementResource(sumber) ? 1 : 0,
      ],
    );
  }

  // Izin untuk aksi yang dilepas DITANDAI usang, bukan dihapus.
  //
  // PADF-CAT-001 mewajibkan hygiene katalog yang bisa dibalik dan melarang
  // pembersihan yang menghilangkan grant milik pengguna. Menghapus baris
  // katalog akan ikut menghapus `mst_user_permission` lewat kunci asing —
  // artinya kewenangan seseorang lenyap hanya karena admin lain menyunting
  // daftar aksi sebuah menu. Menandai usang menahan grant tetap utuh, dan
  // mengembalikan aksinya cukup menghapus penandanya.
  if (aksi.length === 0) {
    await db.query(
      'UPDATE mst_permission SET MstPermissionObsoleteAt = UTC_TIMESTAMP() WHERE MstPermissionResource = ? AND MstPermissionObsoleteAt IS NULL',
      [sumber],
    );
  } else {
    await db.query(
      `UPDATE mst_permission SET MstPermissionObsoleteAt = UTC_TIMESTAMP()
        WHERE MstPermissionResource = ?
          AND MstPermissionObsoleteAt IS NULL
          AND MstPermissionAction NOT IN (${aksi.map(() => '?').join(',')})`,
      [sumber, ...aksi],
    );
  }
};

const validasiMenu = (data) => {
  const errors = {};
  if (!String(data.label || '').trim()) errors.label = 'Label wajib diisi.';
  if (data.path && !pathTersedia(data.path)) {
    errors.path = 'Halaman ini tidak ada. Menu hanya boleh menunjuk halaman yang sudah dibangun.';
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
};

export const createMenu = async (data) => {
  validasiMenu(data);

  // M2: kunci menu diturunkan, tidak pernah diketik. Menu berhalaman memakai
  // path-nya; grup pembungkus memakai labelnya dan tidak mencetak izin apa pun.
  const kunci = menuKey(data);
  const [[ada]] = await getPool().query('SELECT COUNT(*) AS n FROM mst_menu WHERE MstMenuKey = ?', [kunci]);
  if (ada.n > 0) {
    throw new ValidationError({
      path: data.path
        ? 'Halaman ini sudah punya menu. Ubah menu yang ada, bukan membuat yang kedua.'
        : 'Grup dengan label ini sudah ada.',
    });
  }

  const aksi = (data.actions || []).filter((a) => ACTIONS.includes(a));
  const [hasil] = await getPool().query(
    `INSERT INTO mst_menu
       (MstMenuKey, MstMenuLabel, MstMenuPath, MstMenuIcon, MstMenuHeading,
        MstMenuParentId, MstMenuActions, MstMenuOrder, MstMenuEnabled)
     VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?)`,
    [
      kunci, String(data.label).trim(), data.path || null, data.icon || null,
      data.heading || null, data.parent_id ? Number(data.parent_id) : null,
      JSON.stringify(aksi), Number(data.position) || 999, data.enabled === false ? 0 : 1,
    ],
  );
  await sinkronkanIzin({ path: data.path, label: data.label, actions: aksi });
  return getMenu(hasil.insertId);
};

export const updateMenu = async (menuId, data) => {
  const lama = await getMenu(menuId);
  if (!lama) return null;
  validasiMenu({ ...lama, ...data }, { adaKey: false });

  const aksi = (data.actions ?? lama.actions).filter((a) => ACTIONS.includes(a));
  const akanAktif = data.enabled === undefined ? Boolean(lama.enabled) : Boolean(data.enabled);
  if (!akanAktif) await pastikanUserManagementTerjangkau(menuId, { akanAktif: false });

  await getPool().query(
    `UPDATE mst_menu SET MstMenuLabel = ?, MstMenuPath = ?, MstMenuIcon = ?, MstMenuHeading = ?,
            MstMenuParentId = ?, MstMenuActions = CAST(? AS JSON), MstMenuOrder = ?, MstMenuEnabled = ?
      WHERE MstMenuId = ?`,
    [
      String(data.label ?? lama.label).trim(), data.path ?? lama.path, data.icon ?? lama.icon,
      data.heading ?? lama.heading,
      data.parent_id === undefined ? lama.parent_id : (data.parent_id ? Number(data.parent_id) : null),
      JSON.stringify(aksi), Number(data.position ?? lama.position) || 0,
      data.enabled === undefined ? lama.enabled : (data.enabled ? 1 : 0), menuId,
    ],
  );
  await sinkronkanIzin({ path: data.path ?? lama.path, label: data.label ?? lama.label, actions: aksi });
  return getMenu(menuId);
};

/**
 * M8 — Jalur ke User Management dijaga.
 *
 * Menghapus atau menonaktifkan menu terakhir yang menuju pengelolaan pengguna
 * tidak punya jalan pulih dari dalam aplikasi: tidak ada lagi halaman untuk
 * memberi izin kepada siapa pun. Karena itu ditolak, bukan diperingatkan.
 */
const pastikanUserManagementTerjangkau = async (menuId, { akanAktif }) => {
  const semua = await listMenus();
  const jalurUm = semua.filter((m) => m.path && isUserManagementResource(resourceFromPath(m.path)));

  const tersisa = jalurUm.filter((m) => (Number(m.id) === Number(menuId)
    ? Boolean(akanAktif)
    : Boolean(m.enabled)));

  if (tersisa.length === 0) {
    throw new ConflictError(
      'Perubahan ini menutup jalur terakhir menuju pengelolaan pengguna. '
      + 'Aktifkan salah satu menu User Management lain terlebih dahulu.',
    );
  }
};

export const deleteMenu = async (menuId) => {
  const menu = await getMenu(menuId);
  if (!menu) return false;
  await pastikanUserManagementTerjangkau(menuId, { akanAktif: false });
  // Menu sistem menjaga akses ke pengelolaan pengguna. Menghapusnya membuat
  // sistem tidak lagi bisa dipulihkan lewat antarmuka.
  if (menu.is_system) throw new ConflictError('Menu sistem tidak dapat dihapus karena menjaga akses pengelolaan pengguna.');
  // Katalognya ditandai usang, bukan dihapus — lihat catatan di sinkronkanIzin.
  await getPool().query(
    'UPDATE mst_permission SET MstPermissionObsoleteAt = UTC_TIMESTAMP() WHERE MstPermissionResource = ? AND MstPermissionObsoleteAt IS NULL',
    [menu.key],
  );
  await getPool().query('DELETE FROM mst_menu WHERE MstMenuId = ?', [menuId]);
  return true;
};
