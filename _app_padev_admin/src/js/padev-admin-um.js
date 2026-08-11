/**
 * Halaman DAFTAR User Management: Pengguna, Role & Grup, Menu & Izin, Profil.
 *
 * Susunannya menyalin rujukan `api_bridge_gateway` (`views/users.ejs`,
 * `user-groups.ejs`, `menu-permissions.ejs`): kartu metrik di atas, lalu kartu
 * tabel yang dikemudikan `padev-tables.js`, di dalam satu `basic-section`.
 *
 * FORMULIR CRUD TIDAK ADA DI BERKAS INI. Tambah dan ubah pindah ke halaman
 * tersendiri (`padev-*-form.html`, dikemudikan `padev-admin-um-form.js`),
 * sama seperti rujukannya. Satu-satunya formulir yang tersisa milik halaman
 * Profil — identitas, foto, dan kata sandi sendiri — dan itu layanan-diri,
 * bukan CRUD atas orang lain. Bentuknya kartu inline mengikuti rujukan, bukan
 * dialog: tidak ada daftar di belakangnya yang perlu dijaga tetap terlihat.
 *
 * DUA ATURAN PADF-UM-001 YANG TERLIHAT DI HALAMAN INI:
 *
 *  1. Role hanya TEMPLATE. Kartu dan tabel role menyebutnya berulang kali
 *     karena otorisasi tidak pernah membacanya.
 *  2. Menyunting pengguna tidak meminta kata sandi. Karena itu tidak ada aksi
 *     "kata sandi" tersendiri pada baris pengguna — penggantiannya adalah satu
 *     saklar eksplisit di dalam formulirnya.
 *
 * Menyembunyikan menu atau tombol BUKAN otorisasi; seluruh keputusan tetap
 * ditegakkan server. Halaman ini hanya berusaha tidak menampilkan hal yang
 * percuma.
 */
'use strict';

(function initUserManagement() {
  const main = document.querySelector('[data-padev-um]');
  if (!main) return;

  const modul = main.dataset.padevUm;
  const panel = main.querySelector('[data-padev-panel]');
  const aksiBar = main.querySelector('[data-padev-actions]');

  const el = (tag, kelas, isi) => {
    const n = document.createElement(tag);
    if (kelas) n.className = kelas;
    if (isi !== undefined) n.textContent = isi;
    return n;
  };

  const minta = async (url, opsi = {}) => {
    /* Content-Type HANYA dipasang untuk badan JSON.
     *
     * Unggahan berkas memakai FormData, dan batas antar-bagiannya (boundary)
     * hanya diketahui `fetch` saat ia menyusun sendiri header itu. Menuliskan
     * `application/json` di sini membuat multipart-nya tidak pernah terbaca
     * server — permintaannya berangkat, lalu ditolak seolah tidak ada berkas. */
    const formData = opsi.body instanceof FormData;
    const r = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(opsi.body && !formData ? { 'Content-Type': 'application/json' } : {}),
      },
      ...opsi,
    });
    if (r.status === 401) {
      window.location.replace(`/auth/?next=${encodeURIComponent(window.location.pathname)}`);
      throw new Error('Sesi berakhir');
    }
    const isi = await r.json().catch(() => null);
    if (!r.ok) {
      const e = new Error(isi?.message || 'Permintaan gagal');
      e.errors = isi?.errors || {};
      throw e;
    }
    return isi;
  };

  const toastRegion = el('div', 'ui-toast-region');
  toastRegion.setAttribute('aria-live', 'polite');
  document.body.append(toastRegion);

  const toast = (pesan, jenis = 'success') => {
    if (window.PADevToast) return window.PADevToast(pesan, jenis === 'danger' ? 'error' : jenis);
    const k = el('article', `ui-toast ui-feedback--${jenis}`);
    k.setAttribute('role', jenis === 'danger' ? 'alert' : 'status');
    const isi = el('div');
    isi.append(el('strong', null, jenis === 'danger' ? 'Gagal' : 'Berhasil'), el('p', null, pesan));
    k.append(isi);
    toastRegion.append(k);
    window.setTimeout(() => k.remove(), 4200);
  };

  /* Satu pesan sukses dibawa lintas halaman lewat sessionStorage: formulir
   * berada di halaman lain, jadi hasil simpannya tidak bisa ditoast di sana —
   * halamannya keburu ditinggalkan. */
  const KUNCI_PESAN = 'padev-um-pesan';
  const pesanTertunda = window.sessionStorage?.getItem(KUNCI_PESAN);
  if (pesanTertunda) {
    window.sessionStorage.removeItem(KUNCI_PESAN);
    window.setTimeout(() => toast(pesanTertunda), 60);
  }

  /* `padev-tables.js` melaporkan hasil aksi massal lewat global opsional ini.
   * Nadanya dipetakan ke dua nada yang dipunyai toast halaman ini.
   *
   * Mesin memanggilnya tepat sekali di akhir satu putaran aksi massal, jadi ia
   * sekaligus menjadi tanda putaran itu selesai. Halaman lalu digambar ulang
   * dari data server: kartu metrik dan lencana status yang ikut berubah tidak
   * ditebak di layar. */
  window.PADevToast = (pesan, nada) => {
    toast(pesan, nada === 'success' ? 'success' : 'danger');
    if (perluMuatUlang) { perluMuatUlang = false; muat(); }
  };

  /* ======================== Aksi massal ========================
   *
   * Mesin tabel memanggil endpoint SATUAN yang sudah ada, satu per satu — tidak
   * ada endpoint massal baru. Jadi izin, penjaga administrator terakhir, dan
   * penolakan hapus-diri-sendiri tetap yang itu-itu juga, tidak ada aturan yang
   * perlu diduplikasi. Yang diganti hanya cara mengirimnya: rujukan mem-POST
   * form-encoded, API di sini berbicara JSON.
   *
   * `extra` datang apa adanya dari `data-bulk-<aksi>-body` pada barisnya; mesin
   * tidak pernah menafsirkannya, jadi di sini isinya JSON.
   */
  let perluMuatUlang = false;

  const kirimMassal = async ({ url, key, extra }) => {
    await (key === 'delete'
      ? minta(url, { method: 'DELETE' })
      : minta(url, { method: 'PATCH', body: extra || '{}' }));
    perluMuatUlang = true;
  };

  /* ========================= Tabel PA DEV =========================
   *
   * Perakitnya pindah ke `padev-table-build.js` supaya halaman modul konten
   * memakai perakit yang sama persis. Yang tinggal di sini hanya PEMAKAIANNYA:
   * kolom apa, baris apa, saringan apa. Lihat berkas itu untuk kontrak
   * markupnya.
   */
  const {
    berIkon, tanggal, selAvatar, tautanAksi, aksi, tabel: bangunTabel, BENTUK_IKON,
  } = window.PADevTableBuild;

  // `idPrefix` menjaga id menu aksi tetap unik antar modul pada satu dokumen.
  const tabel = (opsi) => bangunTabel({ ...opsi, idPrefix: modul });

  const tautanTombol = (label, href, gaya = 'primary') => {
    const a = el('a', `ui-button ui-button--${gaya} ui-button--sm`, label);
    a.href = href;
    return a;
  };

  const tombol = (label, gaya, onClick) => {
    const b = el('button', `ui-button ui-button--${gaya} ui-button--sm`, label);
    b.type = 'button';
    b.addEventListener('click', onClick);
    return b;
  };

  const lencana = (teks, nada) => el('span', `ui-table-status is-${nada}`, teks);

  /**
   * Kartu metrik, mengikuti susunan rujukan `api_bridge_gateway`.
   *
   * Angka yang menempel pada sebuah daftar — berapa yang aktif, berapa role
   * yang tersedia — adalah yang menentukan apakah daftarnya perlu ditinjau.
   * Ditaruh di atas tabel supaya terbaca lebih dulu.
   */
  const metrik = (kartu) => {
    const grid = el('section', 'pa-metric-grid');
    kartu.forEach(({ ikon, bentuk, label, nilai, catatan, naik }) => {
      const art = el('article', 'pa-metric');
      const ikonEl = bentuk
        ? berIkon('span', 'pa-metric-icon', BENTUK_IKON[bentuk], { 'aria-hidden': 'true' })
        : el('span', 'pa-metric-icon', ikon);
      ikonEl.setAttribute('aria-hidden', 'true');
      art.append(
        ikonEl,
        el('span', 'pa-metric-label', label),
        el('span', 'pa-metric-value', String(nilai)),
        el('span', `pa-metric-note${naik ? ' is-up' : ''}`, catatan),
      );
      grid.append(art);
    });
    return grid;
  };

  /** Izin milik sesi berjalan. Dipakai hanya untuk merapikan tampilan. */
  let izinSaya = [];
  const boleh = (kunci) => izinSaya.includes(kunci);

  /* ============================= Pengguna ============================= */

  const halamanPengguna = async () => {
    const [{ data: daftar }, { data: role }, { user: saya }] = await Promise.all([
      minta('/api/admin/users'), minta('/api/admin/user-groups'), minta('/api/auth/me'),
    ]);
    izinSaya = saya.permissions || [];

    aksiBar.replaceChildren(...(boleh('adminpanel/padev-users:create')
      ? [tautanTombol('+ Tambah pengguna', './padev-users-form.html')]
      : []));

    const aktif = daftar.filter((u) => u.status === 'ACTIVE').length;

    panel.replaceChildren(
      metrik([
        { ikon: 'U', label: 'Total pengguna', nilai: daftar.length, catatan: 'akun terdaftar di panel' },
        { ikon: '✓', label: 'Aktif', nilai: aktif, catatan: 'dapat masuk ke admin', naik: true },
        { ikon: 'R', label: 'Role tersedia', nilai: role.length, catatan: 'template izin untuk akun baru' },
        { ikon: '!', label: 'Nonaktif', nilai: daftar.length - aktif, catatan: 'tidak dapat membuat sesi baru' },
      ]),
      seksiRole(role),
      tabel({
        countLabel: 'pengguna',
        cari: 'Cari nama, email, atau role…',
        kirim: kirimMassal,
        kolom: [
          { label: 'Pengguna' },
          { label: 'Role' },
          { label: 'Izin', detail: true },
          { label: 'Status' },
          { label: 'Terakhir masuk', detail: true },
        ],
        filter: [
          {
            key: 'status',
            label: 'Semua status',
            options: [{ value: 'ACTIVE', label: 'Aktif' }, { value: 'DISABLED', label: 'Nonaktif' }],
          },
          { key: 'role', label: 'Role', options: role.map((g) => ({ value: g.name, label: g.name })) },
        ],
        bulk: boleh('adminpanel/padev-users:update') || boleh('adminpanel/padev-users:delete')
          ? [
            { key: 'disable', label: 'Nonaktifkan terpilih', konfirmasi: 'Nonaktifkan' },
            { key: 'enable', label: 'Aktifkan terpilih', konfirmasi: 'Aktifkan' },
            { key: 'delete', label: 'Hapus terpilih', nada: 'danger', konfirmasi: 'Hapus permanen' },
          ]
          : [],
        baris: daftar.map((u) => {
          const sendiri = u.id === saya.id;
          const bolehHapus = boleh('adminpanel/padev-users:delete') && !sendiri;
          const bolehUbah = boleh('adminpanel/padev-users:update');
          return {
            kunci: { status: u.status, role: u.role || '' },
            cari: `${u.name} ${u.username || ''} ${u.email} ${u.role || ''}`,
            // Akun sendiri tidak menawarkan hapus: server menolaknya dengan
            // `409`, jadi menyodorkannya hanya menjanjikan yang tidak akan terjadi.
            bulk: {
              bulkLabel: u.name,
              ...(bolehHapus ? { bulkDelete: `/api/admin/users/${u.id}` } : {}),
              ...(bolehUbah ? {
                bulkEnable: `/api/admin/users/${u.id}`,
                bulkEnableBody: '{"status":"ACTIVE"}',
                ...(sendiri ? {} : {
                  bulkDisable: `/api/admin/users/${u.id}`,
                  bulkDisableBody: '{"status":"DISABLED"}',
                }),
              } : {}),
            },
            sel: [
              selAvatar(u.name, [u.username, u.email].filter(Boolean).join(' · ')),
              u.role || '—',
              { isi: `${u.permission_count} izin`, urut: u.permission_count },
              lencana(u.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif', u.status === 'ACTIVE' ? 'success' : 'neutral'),
              { isi: tanggal(u.last_login_at), urut: u.last_login_at ? new Date(u.last_login_at).toISOString() : '' },
            ],
            aksiLabel: `Aksi untuk ${u.name}`,
            aksi: [
              tautanAksi(bolehUbah ? 'Ubah pengguna' : 'Lihat pengguna', `./padev-users-form.html?id=${u.id}`),
              ...(bolehHapus ? [aksi('Hapus pengguna', {
                bentuk: 'trash', nada: 'danger', onClick: () => hapus(`/api/admin/users/${u.id}`, u.name),
              })] : []),
            ],
          };
        }),
      }),
    );
  };

  /**
   * "Role yang tersedia" — susunan rujukan `users.ejs`.
   *
   * Ditampilkan sebagai kartu metrik, bukan deretan chip: dua angka yang
   * menempel pada sebuah role — berapa izin yang dibawanya dan berapa orang
   * yang memakainya — adalah yang menentukan apakah role itu perlu ditinjau.
   * Di dalam chip keduanya berdesakan sebagai teks kecil seukuran namanya,
   * jadi tidak ada yang menonjol dan daftarnya hanya terbaca sebagai label.
   */
  const seksiRole = (role) => {
    const seksi = el('section', 'card users-role-section');
    seksi.append(el('h2', null, 'Role yang tersedia'));

    const keterangan = el('p', 'muted');
    keterangan.append('Role adalah template izin, bukan sumber hak akses. ');
    if (boleh('adminpanel/padev-user-groups:read')) {
      const tautan = el('a', null, 'Kelola role & templatenya');
      tautan.href = './padev-user-groups.html';
      keterangan.append(tautan, '.');
    }
    seksi.append(keterangan);

    const grid = metrik(role.map((g) => ({
      bentuk: 'user',
      label: g.name,
      nilai: `${g.permission_count} izin`,
      catatan: `${g.member_count} pengguna memakai role ini`,
      naik: Number(g.member_count) > 0,
    })));
    grid.classList.add('users-role-grid');
    if (role.length === 0) grid.append(el('p', 'empty', 'Belum ada role terdaftar.'));
    seksi.append(grid);
    return seksi;
  };

  /* ============================ Role & Grup ============================ */

  const halamanRole = async () => {
    const [{ data: daftar }, { user: saya }] = await Promise.all([
      minta('/api/admin/user-groups'), minta('/api/auth/me'),
    ]);
    izinSaya = saya.permissions || [];

    aksiBar.replaceChildren(...(boleh('adminpanel/padev-user-groups:create')
      ? [tautanTombol('+ Tambah role', './padev-user-groups-form.html')]
      : []));

    const bolehUbah = boleh('adminpanel/padev-user-groups:update');
    const bolehHapus = boleh('adminpanel/padev-user-groups:delete');

    panel.replaceChildren(tabel({
      countLabel: 'role',
      cari: 'Cari role atau kode…',
      kirim: kirimMassal,
      kolom: [
        { label: 'Role' },
        { label: 'Kode', detail: true },
        { label: 'Izin template', detail: true },
        { label: 'Pengguna' },
      ],
      filter: [
        {
          key: 'tipe',
          label: 'Semua jenis',
          options: [{ value: 'SYSTEM', label: 'Bawaan' }, { value: 'CUSTOM', label: 'Kustom' }],
        },
        {
          key: 'terpakai',
          label: 'Pemakaian',
          options: [{ value: 'YA', label: 'Dipakai pengguna' }, { value: 'TIDAK', label: 'Belum dipakai' }],
        },
      ],
      bulk: bolehHapus ? [{ key: 'delete', label: 'Hapus terpilih', nada: 'danger', konfirmasi: 'Hapus permanen' }] : [],
      baris: daftar.map((g) => {
        const kode = el('span');
        kode.append(el('code', null, g.slug));
        if (g.is_system) kode.append(' ', lencana('bawaan', 'neutral'));
        return {
          kunci: { tipe: g.is_system ? 'SYSTEM' : 'CUSTOM', terpakai: Number(g.member_count) > 0 ? 'YA' : 'TIDAK' },
          cari: `${g.name} ${g.slug} ${g.description || ''}`,
          // Role bawaan tidak menawarkan hapus, sejalan dengan aksi satuannya.
          bulk: {
            bulkLabel: g.name,
            ...(bolehHapus && !g.is_system ? { bulkDelete: `/api/admin/user-groups/${g.id}` } : {}),
          },
          sel: [
            selAvatar(g.name, g.description || '', 'info'),
            kode,
            { isi: `${g.permission_count} izin`, urut: g.permission_count },
            { isi: `${g.member_count} pengguna`, urut: g.member_count },
          ],
          aksiLabel: `Aksi untuk ${g.name}`,
          aksi: [
            tautanAksi(bolehUbah ? 'Ubah role' : 'Lihat role', `./padev-user-groups-form.html?id=${g.id}`),
            ...(bolehHapus && !g.is_system ? [aksi('Hapus role', {
              bentuk: 'trash', nada: 'danger', onClick: () => hapus(`/api/admin/user-groups/${g.id}`, g.name),
            })] : []),
          ],
        };
      }),
    }));
  };

  /* =========================== Menu & Izin ===========================
   *
   * Susunan rujukan `menu-permissions.ejs`: satu kolom per aksi CRUD. Keempat
   * kunci dalam satu baris selalu sama kecuali sufiksnya —
   * `adminpanel/x:read`, `…:create`, … — jadi awalannya ditampilkan sekali di
   * baris meta dan kolom aksinya cukup membawa sufiks. Nilai penuh tetap ada
   * di `title` dan tetap terjaring pencarian lewat `data-search`.
   */

  const AKSI_MENU = [['read', 'Lihat'], ['create', 'Tambah'], ['update', 'Ubah'], ['delete', 'Hapus']];

  const halamanMenu = async () => {
    const [{ data: daftar }, { user: saya }] = await Promise.all([
      minta('/api/admin/menus'), minta('/api/auth/me'),
    ]);
    izinSaya = saya.permissions || [];

    aksiBar.replaceChildren(...(boleh('adminpanel/padev-menu-permissions:create')
      ? [tautanTombol('+ Tambah menu', './padev-menu-permissions-form.html')]
      : []));

    const bolehUbah = boleh('adminpanel/padev-menu-permissions:update');
    const bolehHapus = boleh('adminpanel/padev-menu-permissions:delete');
    const totalIzin = daftar.reduce((n, m) => n + (m.path ? (m.actions || []).length : 0), 0);
    const grup = daftar.filter((m) => !m.path).length;

    panel.replaceChildren(
      metrik([
        { ikon: 'M', label: 'Total menu', nilai: daftar.length, catatan: 'termasuk grup submenu' },
        { ikon: '✓', label: 'Menu aktif', nilai: daftar.filter((m) => m.enabled).length, catatan: 'ditampilkan di navigasi', naik: true },
        { ikon: '#', label: 'Izin terdaftar', nilai: totalIzin, catatan: 'permission key tersedia' },
        { ikon: '↳', label: 'Grup submenu', nilai: grup, catatan: 'pengelompokan sidebar' },
      ]),
      tabel({
        countLabel: 'menu',
        cari: 'Cari menu, path, atau izin…',
        kirim: kirimMassal,
        kelas: 'menu-permission-table',
        kolom: [
          { label: 'Menu' },
          { label: 'Path', detail: true },
          ...AKSI_MENU.map(([, label]) => ({ label, urut: false })),
        ],
        filter: [
          {
            key: 'status',
            label: 'Semua status',
            options: [{ value: 'AKTIF', label: 'Aktif' }, { value: 'TERSEMBUNYI', label: 'Tersembunyi' }],
          },
          {
            key: 'jenis',
            label: 'Jenis',
            options: [{ value: 'GRUP', label: 'Grup submenu' }, { value: 'TAUTAN', label: 'Tautan halaman' }],
          },
        ],
        bulk: bolehUbah || bolehHapus
          ? [
            { key: 'disable', label: 'Nonaktifkan terpilih', konfirmasi: 'Nonaktifkan' },
            { key: 'enable', label: 'Aktifkan terpilih', konfirmasi: 'Aktifkan' },
            { key: 'delete', label: 'Hapus terpilih', nada: 'danger', konfirmasi: 'Hapus permanen' },
          ]
          : [],
        baris: daftar.map((m) => {
          const nama = `${m.parent_label ? `${m.parent_label} › ` : ''}${m.label}`;
          const kunciAksi = (m.actions || []).map((a) => `${m.key}:${a}`);
          const cakupan = m.path ? m.key : '';
          const meta = [
            cakupan || null,
            m.heading ? `heading “${m.heading}”` : null,
            `urutan ${m.position}`,
            m.path ? null : 'grup',
            m.enabled ? null : 'disembunyikan',
          ].filter(Boolean).join(' · ');

          const selNama = el('span');
          const kuat = el('strong', null, nama);
          kuat.title = nama;
          const kecil = el('small', null, meta);
          kecil.title = meta;
          selNama.append(kuat, kecil);

          const selPath = el('span');
          if (m.path) selPath.append(el('code', null, m.path));
          else selPath.append(el('span', 'muted', '— grup —'));

          return {
            kunci: { status: m.enabled ? 'AKTIF' : 'TERSEMBUNYI', jenis: m.path ? 'TAUTAN' : 'GRUP' },
            cari: `${nama} ${m.path || ''} ${kunciAksi.join(' ')}`,
            bulk: {
              bulkLabel: m.label,
              ...(bolehHapus && !m.is_system ? { bulkDelete: `/api/admin/menus/${m.id}` } : {}),
              ...(bolehUbah ? {
                bulkEnable: `/api/admin/menus/${m.id}`,
                bulkEnableBody: '{"enabled":true}',
                bulkDisable: `/api/admin/menus/${m.id}`,
                bulkDisableBody: '{"enabled":false}',
              } : {}),
            },
            sel: [
              { isi: selNama, kelas: 'menu-permission-name' },
              selPath,
              ...AKSI_MENU.map(([a]) => selIzinMenu(m, a)),
            ],
            aksiLabel: `Aksi menu ${m.label}`,
            aksi: [
              tautanAksi(bolehUbah ? 'Ubah menu' : 'Lihat menu', `./padev-menu-permissions-form.html?id=${m.id}`),
              ...(bolehHapus && !m.is_system ? [aksi('Hapus menu', {
                bentuk: 'trash', nada: 'danger', onClick: () => hapus(`/api/admin/menus/${m.id}`, m.label),
              })] : []),
            ],
          };
        }),
      }),
    );
  };

  /** Satu sel aksi pada tabel menu: sufiks izin, plus centang bila saya punya. */
  const selIzinMenu = (menu, aksiMenu) => {
    const wrap = el('span');
    if (!menu.path || !(menu.actions || []).includes(aksiMenu)) {
      wrap.append(el('span', 'muted', '—'));
      return wrap;
    }
    const kunci = `${menu.key}:${aksiMenu}`;
    const kode = el('code', 'permission-key', aksiMenu);
    kode.title = kunci;
    wrap.append(kode);
    if (boleh(kunci)) wrap.append(' ', lencana('✓', 'success'));
    return wrap;
  };

  /* ============================== Profil ============================== */

  /* ============================== Profil Saya ==============================
   *
   * Susunan mengikuti rujukan `api_bridge_gateway` (`profile.ejs`): kepala
   * halaman, pita metrik, lalu dua kartu berdampingan — identitas dan kata
   * sandi — dengan daftar izin sebagai kartu penutup.
   *
   * TAMBAHAN DI LUAR RUJUKAN: kartu foto profil. Rujukan tidak punya avatar
   * sama sekali; di sini navbar template sudah menyediakan tempatnya, jadi
   * fotonya diunggah dari halaman ini dan dipakai kembali di sana.
   *
   * Yang boleh disunting pemiliknya sendiri hanya nama, email, foto, dan kata
   * sandi. Role, status, dan izin tidak ada formulirnya di sini — akun yang
   * bisa menaikkan izinnya sendiri membuat seluruh model izin kehilangan
   * artinya. Daftar izin ditampilkan sebagai bacaan, persis seperti rujukan.
   */

  const kartuProfil = (judul, ...isi) => {
    const kartu = el('article', 'card form-stack');
    kartu.append(el('h2', null, judul), ...isi);
    return kartu;
  };

  /** Satu label + input, susunan yang sama dengan formulir User Management. */
  const bidangProfil = (nama, label, { tipe = 'text', nilai = '', bantuan = '', wajib = false, nonaktif = false, opsional = false, autocomplete } = {}) => {
    const wrap = el('label');
    const teks = el('span', null, label);
    if (opsional) {
      teks.append(' ');
      teks.append(el('small', 'label-optional', '(opsional)'));
    }
    wrap.append(teks);
    const kontrol = document.createElement('input');
    kontrol.type = tipe;
    kontrol.name = nama;
    kontrol.value = nilai ?? '';
    if (autocomplete) kontrol.autocomplete = autocomplete;
    if (wajib) kontrol.required = true;
    if (nonaktif) kontrol.disabled = true;
    wrap.append(kontrol);
    if (bantuan) wrap.append(el('small', null, bantuan));
    const galat = el('span', 'field-error');
    galat.dataset.galat = nama;
    wrap.append(galat);
    return wrap;
  };

  const bersihkanGalat = (form) => {
    form.querySelectorAll('[data-galat]').forEach((n) => { n.textContent = ''; });
  };

  const tampilkanGalat = (form, errors) => {
    Object.entries(errors || {}).forEach(([nama, pesan]) => {
      const slot = form.querySelector(`[data-galat="${nama}"]`);
      if (slot) slot.textContent = pesan;
    });
  };

  /**
   * Modal atur posisi foto.
   *
   * Foto yang diunggah orang hampir tidak pernah persegi, sementara avatar
   * selalu lingkaran. Tanpa langkah ini browser memangkasnya dari tengah, dan
   * wajah yang tidak berada di tengah frame ikut terpotong. Di sini pemiliknya
   * yang menentukan bagian mana yang dipakai.
   *
   * Yang dikirim ke server adalah hasil potongannya, bukan berkas aslinya:
   * ukurannya jadi tetap 512×512 dan tidak ada foto beresolusi kamera yang
   * diam-diam ikut tersimpan.
   */
  const LEBAR_JENDELA = 264;   // sisi area pratinjau, px
  const SISI_KELUARAN = 512;   // sisi berkas hasil, px

  const bukaPengaturPosisi = (berkas, onSelesai) => {
    const overlay = el('div', 'ui-overlay-layer');
    const backdrop = el('div', 'ui-overlay-backdrop');
    const kotak = el('section', 'ui-modal ui-modal--md');
    kotak.setAttribute('role', 'dialog');
    kotak.setAttribute('aria-modal', 'true');
    kotak.setAttribute('aria-label', 'Atur posisi foto profil');

    const header = document.createElement('header');
    const teks = el('div');
    teks.append(el('p', null, 'Foto profil'), el('h2', null, 'Atur posisi'));
    const tombolX = el('button', null, '×');
    tombolX.type = 'button';
    tombolX.setAttribute('aria-label', 'Tutup');
    header.append(teks, tombolX);

    const badan = el('div', 'ui-modal-body');
    const jendela = el('div', 'profil-krop');
    const gambar = document.createElement('img');
    gambar.alt = '';
    gambar.draggable = false;
    const bingkai = el('span', 'profil-krop-bingkai');
    bingkai.setAttribute('aria-hidden', 'true');
    jendela.append(gambar, bingkai);

    const kendali = el('label', 'profil-krop-zoom');
    kendali.append(el('span', null, 'Perbesar'));
    const zoom = document.createElement('input');
    zoom.type = 'range';
    zoom.min = '1';
    zoom.max = '3';
    zoom.step = '0.01';
    zoom.value = '1';
    kendali.append(zoom);
    badan.append(
      jendela,
      kendali,
      el('p', 'profil-krop-bantuan', 'Geser foto untuk memindahkan, lalu atur perbesarannya.'),
    );

    const footer = document.createElement('footer');
    const batal = el('button', null, 'Batal');
    batal.type = 'button';
    const simpan = el('button', 'is-primary', 'Simpan foto');
    simpan.type = 'button';
    footer.append(batal, simpan);

    kotak.append(header, badan, footer);
    overlay.append(backdrop, kotak);
    document.body.append(overlay);

    const sumber = URL.createObjectURL(berkas);
    let dasar = 1;   // skala terkecil yang masih menutup penuh jendela
    let skala = 1;
    let ox = 0;
    let oy = 0;

    /* Foto WAJIB selalu menutup penuh jendela: begitu tepinya masuk, hasil
     * potongannya berisi bidang kosong yang tidak pernah diminta siapa pun. */
    const jepit = () => {
      const lebar = gambar.naturalWidth * skala;
      const tinggi = gambar.naturalHeight * skala;
      ox = Math.min(0, Math.max(LEBAR_JENDELA - lebar, ox));
      oy = Math.min(0, Math.max(LEBAR_JENDELA - tinggi, oy));
    };

    const gambarkan = () => {
      jepit();
      gambar.style.width = `${gambar.naturalWidth * skala}px`;
      gambar.style.height = `${gambar.naturalHeight * skala}px`;
      gambar.style.transform = `translate(${ox}px, ${oy}px)`;
    };

    gambar.addEventListener('load', () => {
      dasar = Math.max(LEBAR_JENDELA / gambar.naturalWidth, LEBAR_JENDELA / gambar.naturalHeight);
      skala = dasar;
      ox = (LEBAR_JENDELA - gambar.naturalWidth * skala) / 2;
      oy = (LEBAR_JENDELA - gambar.naturalHeight * skala) / 2;
      gambarkan();
    }, { once: true });
    gambar.src = sumber;

    zoom.addEventListener('input', () => {
      const tengahX = (LEBAR_JENDELA / 2 - ox) / skala;
      const tengahY = (LEBAR_JENDELA / 2 - oy) / skala;
      skala = dasar * Number(zoom.value);
      // Titik yang tadinya di tengah jendela tetap di tengah setelah diperbesar.
      ox = LEBAR_JENDELA / 2 - tengahX * skala;
      oy = LEBAR_JENDELA / 2 - tengahY * skala;
      gambarkan();
    });

    let seret = null;
    jendela.addEventListener('pointerdown', (event) => {
      seret = { x: event.clientX, y: event.clientY, ox, oy };
      jendela.setPointerCapture(event.pointerId);
      jendela.classList.add('is-menyeret');
    });
    jendela.addEventListener('pointermove', (event) => {
      if (!seret) return;
      ox = seret.ox + (event.clientX - seret.x);
      oy = seret.oy + (event.clientY - seret.y);
      gambarkan();
    });
    const lepas = () => { seret = null; jendela.classList.remove('is-menyeret'); };
    jendela.addEventListener('pointerup', lepas);
    jendela.addEventListener('pointercancel', lepas);

    const tutup = () => {
      URL.revokeObjectURL(sumber);
      overlay.remove();
      document.removeEventListener('keydown', padaEscape);
    };
    function padaEscape(event) { if (event.key === 'Escape') tutup(); }
    document.addEventListener('keydown', padaEscape);
    [backdrop, tombolX, batal].forEach((n) => n.addEventListener('click', tutup));

    simpan.addEventListener('click', () => {
      const kanvas = document.createElement('canvas');
      kanvas.width = SISI_KELUARAN;
      kanvas.height = SISI_KELUARAN;
      const rasio = SISI_KELUARAN / LEBAR_JENDELA;
      const konteks = kanvas.getContext('2d');
      konteks.drawImage(
        gambar,
        ox * rasio, oy * rasio,
        gambar.naturalWidth * skala * rasio, gambar.naturalHeight * skala * rasio,
      );
      // JPEG: hasilnya foto, dan lingkarannya dibentuk CSS — tidak ada
      // transparansi yang perlu dipertahankan.
      kanvas.toBlob((blob) => {
        if (!blob) { toast('Foto gagal diproses di browser.', 'danger'); return; }
        tutup();
        onSelesai(new File([blob], 'foto-profil.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  /**
   * Kartu foto profil.
   *
   * Bentuk unggahnya memakai komponen `ui-dropzone` milik tema — kotak putus
   * yang sama dengan halaman upload template, lengkap dengan keadaan seret.
   * Halaman ini tidak menggambar bentuk unggah sendiri.
   */
  const kartuFoto = (user, sesudahBerubah) => {
    const kartu = el('article', 'card form-stack');
    kartu.append(el('h2', null, 'Foto profil'));

    const baris = el('div', 'profil-foto-baris');
    const pratinjau = el('span', 'profil-foto');
    const gambarkanPratinjau = (url) => {
      pratinjau.replaceChildren();
      if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = `Foto profil ${user.name}`;
        pratinjau.append(img);
      } else {
        pratinjau.textContent = inisialNama(user.name || user.email);
      }
    };
    gambarkanPratinjau(user.avatarUrl);

    const status = el('p', 'upload-live-status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = user.avatarUrl ? 'Foto profil terpasang.' : 'Belum ada foto profil.';

    const berkas = document.createElement('input');
    berkas.type = 'file';
    berkas.className = 'sr-only';
    berkas.accept = 'image/png,image/jpeg,image/webp,image/avif';
    berkas.id = 'profil-foto-berkas';

    const zona = el('div', 'ui-dropzone');
    zona.setAttribute('role', 'button');
    zona.setAttribute('tabindex', '0');
    zona.setAttribute('aria-label', 'Pilih foto profil');
    /* SVG-nya ditulis lengkap dengan `fill="none"` dan `stroke`, sama persis
     * dengan markup dropzone template. `berIkon` menaruh atribut pada
     * pembungkusnya, bukan pada <svg>, sehingga ikonnya jatuh ke fill hitam
     * bawaan dan tampil sebagai kotak pekat. */
    const ikon = el('span', 'ui-dropzone-icon');
    ikon.setAttribute('aria-hidden', 'true');
    ikon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M5 14v5h14v-5"/></svg>';
    zona.append(
      berkas,
      ikon,
      el('span', 'ui-dropzone-title', 'Tarik foto atau klik untuk pilih'),
      el('span', 'ui-dropzone-hint', 'PNG, JPG, WebP, atau AVIF · maksimum 4 MB'),
    );

    const unggah = async (file) => {
      const data = new FormData();
      data.append('file', file);
      status.textContent = 'Mengunggah…';
      try {
        const hasil = await minta('/api/admin/me/avatar', { method: 'POST', body: data });
        gambarkanPratinjau(hasil.url);
        status.textContent = 'Foto profil terpasang.';
        hapus.disabled = false;
        toast(hasil.message);
        sesudahBerubah();
      } catch (error) {
        status.textContent = 'Foto gagal diunggah.';
        toast(error.message, 'danger');
      }
    };

    const terima = (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        toast('Berkas yang dipilih bukan gambar.', 'danger');
        return;
      }
      // Modal atur posisi selalu muncul: bagian foto yang dipakai ditentukan
      // pemiliknya, bukan hasil pangkas tengah oleh browser.
      bukaPengaturPosisi(file, unggah);
    };

    zona.addEventListener('click', (event) => {
      if (event.target !== berkas) berkas.click();
    });
    zona.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); berkas.click(); }
    });
    berkas.addEventListener('change', () => {
      terima(berkas.files?.[0]);
      berkas.value = '';
    });
    ['dragenter', 'dragover'].forEach((nama) => zona.addEventListener(nama, (event) => {
      event.preventDefault();
      zona.classList.add('is-drag-active');
    }));
    ['dragleave', 'drop'].forEach((nama) => zona.addEventListener(nama, (event) => {
      event.preventDefault();
      zona.classList.remove('is-drag-active');
    }));
    zona.addEventListener('drop', (event) => terima(event.dataTransfer?.files?.[0]));

    const hapus = el('button', 'ui-button ui-button--outline ui-button--sm', 'Hapus foto');
    hapus.type = 'button';
    hapus.disabled = !user.avatarUrl;
    hapus.addEventListener('click', async () => {
      try {
        const hasil = await minta('/api/admin/me/avatar', { method: 'DELETE' });
        gambarkanPratinjau(null);
        status.textContent = 'Belum ada foto profil.';
        hapus.disabled = true;
        toast(hasil.message);
        sesudahBerubah();
      } catch (error) {
        toast(error.message, 'danger');
      }
    });

    const sisiKiri = el('div', 'profil-foto-sisi');
    sisiKiri.append(pratinjau, hapus);
    const sisiKanan = el('div', 'profil-foto-zona');
    sisiKanan.append(zona, status);
    baris.append(sisiKiri, sisiKanan);
    kartu.append(baris);
    return kartu;
  };
  const inisialNama = (nama) => String(nama || '?').trim().split(/\s+/).slice(0, 2)
    .map((bagian) => bagian.charAt(0).toUpperCase()).join('');

  const halamanProfil = async () => {
    const { user } = await minta('/api/auth/me');
    const muatUlang = () => { halamanProfil().catch((error) => toast(error.message, 'danger')); };

    /* Foto berubah tanpa menggambar ulang halaman: kartunya sudah memperbarui
     * pratinjaunya sendiri, yang tersisa hanya avatar di navbar. Selektornya
     * milik `padev-admin-session.js`, jadi yang dikirim dari sini cuma kabar —
     * bukan salinan kedua dari cara melukis avatar. */
    const kabarkanFotoBerubah = () => {
      document.dispatchEvent(new CustomEvent('padev:profil-berubah'));
    };

    const judul = main.querySelector('[data-profil-nama]');
    const ringkas = main.querySelector('[data-profil-ringkas]');
    if (judul) judul.textContent = user.name || user.email;
    if (ringkas) {
      ringkas.textContent = [
        user.username || user.email,
        `grup ${user.role || 'tidak diatur'}`,
        `${user.permissions.length} izin`,
      ].join(' · ');
    }
    aksiBar.replaceChildren();

    const pita = metrik([
      { bentuk: 'check', label: 'Status akun', nilai: user.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif', catatan: 'akses admin mengikuti status ini', naik: user.status === 'ACTIVE' },
      { bentuk: 'user', label: 'Grup', nilai: user.role || '—', catatan: 'template izin terakhir' },
      { bentuk: 'settings', label: 'Izin aktif', nilai: user.permissions.length, catatan: 'hak akses yang melekat pada akun' },
      { bentuk: 'eye', label: 'Email', nilai: user.email ? 'Terisi' : 'Belum', catatan: 'dipakai untuk identitas akun' },
    ]);

    /* ---- Identitas ---- */
    const formIdentitas = el('form', 'form-stack');
    formIdentitas.noValidate = true;
    formIdentitas.append(
      bidangProfil('name', 'Nama lengkap', { nilai: user.name, wajib: true }),
      bidangProfil('email', 'Email', { tipe: 'email', nilai: user.email, wajib: true }),
      bidangProfil('username', 'Nama masuk', {
        nilai: user.username || user.email,
        nonaktif: true,
        bantuan: 'Tidak dapat diubah sendiri. Hubungi pengelola pengguna bila perlu diganti.',
      }),
    );
    const aksiIdentitas = el('div', 'form-actions');
    const simpanIdentitas = el('button', 'ui-button ui-button--primary', 'Simpan identitas');
    simpanIdentitas.type = 'submit';
    aksiIdentitas.append(simpanIdentitas);
    formIdentitas.append(aksiIdentitas);

    formIdentitas.addEventListener('submit', async (event) => {
      event.preventDefault();
      bersihkanGalat(formIdentitas);
      const data = new FormData(formIdentitas);
      try {
        const hasil = await minta('/api/admin/me', {
          method: 'PATCH',
          body: JSON.stringify({ name: data.get('name'), email: data.get('email') }),
        });
        toast(hasil.message);
        muatUlang();
      } catch (error) {
        tampilkanGalat(formIdentitas, error.errors);
        toast(error.message, 'danger');
      }
    });

    /* ---- Kata sandi ---- */
    const formSandi = el('form', 'form-stack');
    formSandi.noValidate = true;
    formSandi.append(
      bidangProfil('current_password', 'Kata sandi saat ini', { tipe: 'password', wajib: true, autocomplete: 'current-password' }),
      bidangProfil('new_password', 'Kata sandi baru', { tipe: 'password', wajib: true, autocomplete: 'new-password', bantuan: 'Minimal 10 karakter. Seluruh sesi lain akan berakhir.' }),
    );
    const aksiSandi = el('div', 'form-actions');
    const simpanSandi = el('button', 'ui-button ui-button--primary', 'Ubah kata sandi');
    simpanSandi.type = 'submit';
    aksiSandi.append(simpanSandi);
    formSandi.append(aksiSandi);

    formSandi.addEventListener('submit', async (event) => {
      event.preventDefault();
      bersihkanGalat(formSandi);
      const data = new FormData(formSandi);
      try {
        const hasil = await minta('/api/admin/me/password', {
          method: 'POST',
          body: JSON.stringify({
            current_password: data.get('current_password'),
            new_password: data.get('new_password'),
          }),
        });
        toast(hasil.message);
        formSandi.reset();
      } catch (error) {
        // Server memakai kunci `current`/`next`; slot galatnya bernama seperti field.
        tampilkanGalat(formSandi, {
          current_password: error.errors?.current,
          new_password: error.errors?.next,
        });
        toast(error.message, 'danger');
      }
    });

    const kolom = el('div', 'user-form-grid');
    kolom.append(
      kartuProfil('Identitas', formIdentitas),
      kartuProfil('Ubah kata sandi',
        el('p', 'muted', 'Kata sandi saat ini wajib diisi. Tanpa itu, sesi yang tertinggal terbuka di perangkat lain bisa dipakai mengunci Anda dari akun sendiri.'),
        formSandi),
    );

    /* ---- Izin (bacaan saja) ---- */
    const kartuIzin = el('article', 'card form-stack');
    kartuIzin.append(
      el('h2', null, 'Izin yang Anda miliki'),
      el('p', 'muted', 'Daftar ini bersifat informatif. Perubahannya dilakukan pengelola pengguna, bukan dari halaman ini.'),
    );
    const chip = el('div', 'profil-chip-row');
    if (user.permissions.length === 0) {
      chip.append(el('p', 'empty', 'Belum ada izin. Hubungi pengelola pengguna.'));
    }
    user.permissions.slice().sort().forEach((k) => {
      const s = el('span', 'profil-chip');
      s.append(el('code', null, k));
      chip.append(s);
    });
    kartuIzin.append(chip);

    panel.replaceChildren(pita, kartuFoto(user, kabarkanFotoBerubah), kolom, kartuIzin);
  };


  /* ============================== Umum ============================== */

  const hapus = async (url, nama) => {
    if (!window.confirm(`Hapus "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await minta(url, { method: 'DELETE' });
      toast('Data dihapus.');
      muat();
    } catch (error) {
      toast(error.message, 'danger');
    }
  };

  const muat = () => {
    const peta = {
      users: halamanPengguna, 'user-groups': halamanRole, menus: halamanMenu, profile: halamanProfil,
    };
    peta[modul]?.().catch((error) => {
      panel.replaceChildren(el('p', 'empty', error.message));
    });
  };

  muat();
}());
