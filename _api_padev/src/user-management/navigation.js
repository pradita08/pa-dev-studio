/**
 * REGISTRY MENU BAWAAN — hanya benih, bukan sumber hidup.
 *
 * Mengikuti binding `node-user-management` PA DEV:
 *
 *   M1  Registry adalah DATA di database, diadministrasi saat runtime. Daftar
 *       di berkas ini hanya dipakai sekali untuk mengisi tabel `mst_menu` yang
 *       masih kosong. Tidak ada satu pun jalur runtime yang membacanya lagi —
 *       sidebar, katalog izin, dan halaman Menu & Izin semuanya membaca
 *       database.
 *
 *   M2  Nama izin DITURUNKAN dari path menu dan aksinya, tidak pernah ditulis
 *       tangan. Memindahkan halaman berarti izinnya ikut berpindah, dan tidak
 *       ada nama yang diketik dua kali.
 *
 *   M7  Entri yang tidak memiliki halaman — kepala kelompok dan grup pembungkus
 *       — tidak menghasilkan izin apa pun.
 */

/** Aksi CRUD yang dikenal. Tidak ada aksi bebas seperti `export`. */
export const ACTIONS = Object.freeze(['read', 'create', 'update', 'delete']);

export const ACTION_LABELS = Object.freeze({
  read: 'Lihat', create: 'Tambah', update: 'Ubah', delete: 'Hapus',
});

/**
 * Menurunkan sumber daya izin dari path menu.
 *
 * `/adminpanel/padev-users.html` → `adminpanel/padev-users`
 *
 * Akhiran `.html` dibuang karena ia detail penyajian, bukan identitas halaman;
 * selebihnya path dipakai apa adanya supaya penurunan tetap satu arah dan
 * tidak ada ruang untuk mengarang nama.
 */
export const resourceFromPath = (path) => String(path)
  .replace(/^\//, '')
  .replace(/\.html$/i, '');

/** @param {string} path @param {string} action */
export const permissionKey = (path, action) => `${resourceFromPath(path)}:${action}`;

/**
 * Menu bawaan.
 *
 * `path`  tautan halaman; wajib menunjuk berkas yang benar-benar dibangun (M3).
 * Tidak ada kolom `key` yang ditulis tangan: kunci menu maupun nama izin
 * keduanya diturunkan dari path.
 */
export const DEFAULT_MENUS = [
  {
    label: 'Dashboard',
    path: '/adminpanel/dashboard.html',
    icon: 'M3 10.5 12 3l9 7.5M5 9.75V21h14V9.75M10 21v-6h4v6',
    actions: ['read'],
    isSystem: 1,
  },

  {
    // Diletakkan tepat di bawah Dashboard: pengelolaan siapa-boleh-apa adalah
    // hal pertama yang disiapkan saat memasang sistem, bukan pelengkap di
    // dasar daftar.
    label: 'User Management',
    icon: 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M18 8v6M21 11h-6',
    children: [
      { label: 'Users', path: '/adminpanel/padev-users.html', actions: ACTIONS, isSystem: 1 },
      { label: 'Groups', path: '/adminpanel/padev-user-groups.html', actions: ACTIONS, isSystem: 1 },
      { label: 'Permissions', path: '/adminpanel/padev-menu-permissions.html', actions: ACTIONS, isSystem: 1 },
    ],
  },

  {
    label: 'Content',
    icon: 'M4 5h16v14H4zM4 9h16M9 9v10',
    children: [
      { label: 'Homepage', path: '/adminpanel/padev-homepage.html', actions: ['read', 'update'] },
      { label: 'Insights', path: '/adminpanel/padev-articles.html', actions: ACTIONS },
      { label: 'Testimonials', path: '/adminpanel/padev-testimonials.html', actions: ACTIONS },
      { label: 'Company', path: '/adminpanel/padev-companies.html', actions: ACTIONS },
      { label: 'FAQ', path: '/adminpanel/padev-faq.html', actions: ACTIONS },
    ],
  },

  {
    label: 'Portfolio & Business',
    icon: 'M3 7h18v13H3zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18',
    children: [
      { label: 'Services', path: '/adminpanel/padev-services.html', actions: ACTIONS },
      { label: 'Templates', path: '/adminpanel/padev-templates.html', actions: ACTIONS },
      { label: 'Projects', path: '/adminpanel/padev-projects.html', actions: ACTIONS },
    ],
  },

  {
    label: 'Leads',
    icon: 'M3 6h18v12H3zM3 7l9 6 9-6',
    children: [
      // Pesan masuk tidak pernah dibuat dari panel — hanya dibaca, ditandai,
      // dan dibuang. Karena itu tanpa `create`.
      { label: 'Messages', path: '/adminpanel/padev-inquiries.html', actions: ['read', 'update', 'delete'] },
      /* `update` ikut karena kolom status ada gunanya: menandai seseorang
       * berhenti berlangganan jauh lebih benar daripada menghapus barisnya —
       * alamat yang dihapus bisa masuk lagi lewat form dan dikirimi surat
       * ulang. Yang boleh disunting tetap dibatasi di `content-modules.js`:
       * status dan catatan saja, tidak pernah alamatnya. */
      { label: 'Subscribers', path: '/adminpanel/padev-subscribers.html', actions: ACTIONS },
    ],
  },

  {
    label: 'Settings',
    path: '/adminpanel/padev-settings.html',
    icon: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
    actions: ['read', 'update'],
  },

];

/**
 * Kunci menu.
 *
 * Menu berhalaman memakai path sebagai identitasnya. Grup pembungkus tidak
 * punya path, jadi kuncinya diturunkan dari label — ia tidak pernah menjadi
 * nama izin (M7), hanya penanda baris di tabel.
 */
export const menuKey = (entri) => (entri.path
  ? resourceFromPath(entri.path)
  : `group/${String(entri.label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`);

/** Semua entri menu yang bukan kepala kelompok, apa pun kedalamannya. */
export const flattenMenus = (menus = DEFAULT_MENUS) => {
  const hasil = [];
  const jalan = (daftar, indukKey = null) => {
    for (const entri of daftar) {
      if (entri.heading) continue;
      hasil.push({ ...entri, key: menuKey(entri), parentKey: indukKey });
      if (entri.children) jalan(entri.children, menuKey(entri));
    }
  };
  jalan(menus);
  return hasil;
};

/**
 * Menandai izin milik User Management.
 *
 * Dipakai dua kali: menegakkan "aktivasi bawaan tidak mencakup User Management"
 * (PADF-UM-001) dan menjaga jalur terakhir ke pengelolaan pengguna (M8). Karena
 * itu penandanya harus bisa dibaca query, bukan ditebak dari nama izin.
 */
export const isUserManagementResource = (resource) => /^adminpanel\/padev-(users|user-groups|menu-permissions)$/
  .test(String(resource));

/**
 * Katalog izin yang diturunkan dari registry.
 *
 * Menu tanpa path tidak menghasilkan izin: tidak ada halaman yang perlu
 * dijaga di sana (M7).
 */
export const permissionCatalogFromMenus = (menus = DEFAULT_MENUS) => flattenMenus(menus)
  .filter((entri) => entri.path && entri.actions?.length)
  .flatMap((entri) => entri.actions.map((action) => ({
    key: permissionKey(entri.path, action),
    resource: resourceFromPath(entri.path),
    action,
    label: `${ACTION_LABELS[action]} ${entri.label}`,
    groupLabel: entri.label,
    isUserManagement: isUserManagementResource(resourceFromPath(entri.path)) ? 1 : 0,
  })));

/**
 * Role bawaan beserta template izinnya.
 *
 * Template hanya dipakai sebagai centang awal saat pengguna dibuat atau role-nya
 * diganti. Mengubah template TIDAK mengubah izin pengguna yang sudah tersimpan.
 */
export const DEFAULT_ROLES = [
  {
    slug: 'administrator',
    name: 'Administrator',
    description: 'Akses penuh termasuk pengelolaan pengguna.',
    permissions: 'ALL',
  },
  {
    slug: 'admin',
    name: 'Admin',
    description: 'Mengelola seluruh konten, tanpa pengelolaan pengguna.',
    permissions: (katalog) => katalog.filter((izin) => !izin.isUserManagement).map((izin) => izin.key),
  },
  {
    slug: 'editor',
    name: 'Editor',
    description: 'Menulis dan menerbitkan konten, tanpa menghapus.',
    permissions: (katalog) => katalog
      .filter((izin) => !izin.isUserManagement && izin.action !== 'delete')
      .map((izin) => izin.key),
  },
  {
    slug: 'viewer',
    name: 'Viewer',
    description: 'Hanya melihat, tidak dapat mengubah apa pun.',
    permissions: (katalog) => katalog.filter((izin) => izin.action === 'read').map((izin) => izin.key),
  },
];

export const resolveRolePermissions = (role, katalog) => (role.permissions === 'ALL'
  ? katalog.map((izin) => izin.key)
  : role.permissions(katalog));
