/**
 * Menerapkan susunan menu bawaan ke registry yang SUDAH terisi.
 *
 * KENAPA INI TIDAK OTOMATIS SAAT BOOT
 * `seedMenus()` sengaja berhenti begitu `mst_menu` berisi sesuatu (binding M1:
 * registry adalah data milik operator, bukan cerminan berkas kode). Kalau seed
 * boleh menimpa, setiap deploy akan diam-diam mengembalikan urutan, ikon, dan
 * status aktif yang barusan diatur orang dari halaman Menu & Izin.
 *
 * Karena itu penyusunan ulang adalah tindakan yang DINYATAKAN, bukan efek
 * samping menghidupkan server:
 *
 *     docker compose exec pa_dev_api npm run menu:apply
 *
 * YANG DIJAGA
 * Nama izin diturunkan dari PATH halaman, bukan dari label menunya (M2). Jadi
 * mengganti "Inquiry" menjadi "Messages" atau memindahkannya ke grup lain tidak
 * menyentuh satu pun grant: kuncinya tetap `adminpanel/padev-inquiries:*`.
 * Yang benar-benar baru hanyalah halaman yang memang belum pernah ada.
 *
 * Grant tidak pernah dihapus di sini. Baris `mst_menu` dibuang dan ditanam
 * ulang, tetapi `mst_permission` hanya di-upsert oleh `seedUserManagement()`,
 * dan `mst_user_permission` menunjuk ke baris izin — bukan ke baris menu.
 */
import { getPool, waitForDatabase } from '../src/db.js';
import { config } from '../src/config.js';
import { seedUserManagement } from '../src/user-management/schema.js';
import { DEFAULT_MENUS, flattenMenus, permissionKey } from '../src/user-management/navigation.js';

const jalankan = async () => {
  await waitForDatabase();
  const db = getPool();

  const [[sebelum]] = await db.query('SELECT COUNT(*) AS n FROM mst_menu');
  console.log(`[menu] registry berisi ${sebelum.n} baris sebelum disusun ulang`);

  // Anak dibuang lebih dulu lewat ON DELETE CASCADE pada induknya.
  await db.query('DELETE FROM mst_menu');
  console.log('[menu] registry dikosongkan');

  // `seedUserManagement` memanggil `seedMenus()` di akhir, dan seed itu kini
  // melihat tabel kosong sehingga menanam susunan terbaru.
  await seedUserManagement();

  const [[sesudah]] = await db.query('SELECT COUNT(*) AS n FROM mst_menu');
  console.log(`[menu] registry berisi ${sesudah.n} baris sesudah disusun ulang`);

  /* Izin halaman yang baru lahir belum dipegang siapa pun — termasuk oleh
   * administrator yang menjalankan perintah ini. Kalau dibiarkan, menunya ada
   * di database tetapi tidak muncul di sidebar siapa pun, dan tidak ada seorang
   * pun yang bisa membukanya untuk memberikan izinnya kepada orang lain.
   *
   * Alasan yang sama persis dengan `seedBootstrapAdmin`, jadi penerimanya pun
   * sama: SATU akun bootstrap di ADMIN_EMAIL. Tidak diberikan ke "semua yang
   * ber-role Administrator" — role adalah template, bukan sumber kewenangan,
   * dan membagikan izin berdasarkan role akan menaikkan kewenangan orang lain
   * tanpa ada yang memutuskannya. */
  const email = String(config.seed?.email || '').trim().toLowerCase();
  if (!email) {
    console.warn('[menu] ADMIN_EMAIL kosong — izin halaman baru tidak diberikan ke siapa pun');
    return;
  }

  const kunciBaru = flattenMenus(DEFAULT_MENUS)
    .filter((entri) => entri.path && entri.actions?.length)
    .flatMap((entri) => entri.actions.map((aksi) => permissionKey(entri.path, aksi)));

  const [hasil] = await db.query(
    `INSERT IGNORE INTO mst_user_permission (MstUserId, MstPermissionId)
     SELECT u.MstUserId, p.MstPermissionId
       FROM mst_user u
       JOIN mst_permission p
         ON p.MstPermissionKey IN (${kunciBaru.map(() => '?').join(',')})
      WHERE u.MstUserEmail = ?
        AND p.MstPermissionObsoleteAt IS NULL`,
    [...kunciBaru, email],
  );
  console.log(`[menu] ${hasil.affectedRows} izin ditambahkan ke akun bootstrap ${email}`);
};

jalankan()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[menu] gagal:', error);
    process.exit(1);
  });
