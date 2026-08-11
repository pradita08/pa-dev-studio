/**
 * Rebase registry ke penamaan izin turunan (M2), sekali jalan.
 *
 * Versi pertama menuliskan kunci menu dan nama izin dengan tangan
 * (`adminpanel/articles`). Binding `node-user-management` mewajibkan keduanya
 * DITURUNKAN dari path halaman, sehingga nama yang benar adalah
 * `adminpanel/padev-articles`.
 *
 * PADF-CAT-001 melarang pemindahan katalog yang menghilangkan grant. Karena itu
 * urutannya: catat dulu grant milik setiap pengguna sebagai pasangan
 * (sumber, aksi), buang registry lama, tanam ulang dari path, lalu kembalikan
 * grant memakai nama baru. Tidak ada pengguna yang kehilangan atau mendadak
 * memperoleh kewenangan.
 *
 * Berkas ini menjadi tidak berguna setelah semua lingkungan ter-rebase, dan
 * memang dirancang untuk dihapus saat itu.
 */
import { getPool } from '../db.js';
import { resourceFromPath } from './navigation.js';

/** Sumber daya lama → path halaman yang sekarang menjadi identitasnya. */
const PETA_LAMA = new Map([
  ['adminpanel/dashboard', '/adminpanel/dashboard.html'],
  ['adminpanel/inquiries', '/adminpanel/padev-inquiries.html'],
  ['adminpanel/articles', '/adminpanel/padev-articles.html'],
  ['adminpanel/projects', '/adminpanel/padev-projects.html'],
  ['adminpanel/templates', '/adminpanel/padev-templates.html'],
  ['adminpanel/companies', '/adminpanel/padev-companies.html'],
  ['adminpanel/users', '/adminpanel/padev-users.html'],
  ['adminpanel/user-groups', '/adminpanel/padev-user-groups.html'],
  ['adminpanel/menu-permissions', '/adminpanel/padev-menu-permissions.html'],
]);

const sumberBaru = (lama) => {
  const path = PETA_LAMA.get(lama);
  return path ? resourceFromPath(path) : null;
};

export const rebaseLegacyRegistry = async () => {
  const db = getPool();

  const [[jejak]] = await db.query(
    `SELECT COUNT(*) AS n FROM mst_permission
      WHERE MstPermissionResource IN (${[...PETA_LAMA.keys()].map(() => '?').join(',')})`,
    [...PETA_LAMA.keys()],
  );
  if (jejak.n === 0) return;

  // 1. Catat grant yang sedang berlaku, per pengguna.
  const [grant] = await db.query(
    `SELECT up.MstUserId AS userId, p.MstPermissionResource AS sumber, p.MstPermissionAction AS aksi
       FROM mst_user_permission up
       JOIN mst_permission p ON p.MstPermissionId = up.MstPermissionId`,
  );

  // 2. Catat template role juga — ia bukan otorisasi, tetapi kehilangan template
  //    berarti pengguna berikutnya lahir tanpa centang awal yang benar.
  const [template] = await db.query(
    `SELECT gp.MstUserGroupId AS groupId, p.MstPermissionResource AS sumber, p.MstPermissionAction AS aksi
       FROM mst_user_group_permission gp
       JOIN mst_permission p ON p.MstPermissionId = gp.MstPermissionId`,
  );

  // 3. Buang registry lama. Menu dibuang lebih dulu supaya seed menanam ulang.
  await db.query('DELETE FROM mst_menu');
  await db.query('DELETE FROM mst_permission');
  console.log(`[um] rebase: ${grant.length} grant dan ${template.length} baris template dicatat`);

  return async () => {
    // Dipanggil SETELAH seed menanam katalog baru.
    const [barisIzin] = await db.query(
      'SELECT MstPermissionId, MstPermissionResource, MstPermissionAction FROM mst_permission',
    );
    const idIzin = new Map(barisIzin.map((b) => [`${b.MstPermissionResource}:${b.MstPermissionAction}`, b.MstPermissionId]));

    let pulih = 0;
    for (const g of grant) {
      const baru = sumberBaru(g.sumber) || g.sumber;
      const id = idIzin.get(`${baru}:${g.aksi}`);
      if (!id) continue;
      await db.query('INSERT IGNORE INTO mst_user_permission (MstUserId, MstPermissionId) VALUES (?, ?)', [g.userId, id]);
      pulih += 1;
    }

    for (const t of template) {
      const baru = sumberBaru(t.sumber) || t.sumber;
      const id = idIzin.get(`${baru}:${t.aksi}`);
      if (!id) continue;
      await db.query('INSERT IGNORE INTO mst_user_group_permission (MstUserGroupId, MstPermissionId) VALUES (?, ?)', [t.groupId, id]);
    }

    console.log(`[um] rebase selesai: ${pulih} dari ${grant.length} grant dipulihkan ke nama izin turunan`);
  };
};
