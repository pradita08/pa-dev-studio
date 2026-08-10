/**
 * Membuat halaman modul PA DEV Studio dari shell template.
 *
 * Halaman admin di template ini berisi shell lengkap (sidebar, navbar, footer)
 * yang ditulis inline di setiap berkas. Menyalin `dashboard.html` lalu menukar
 * isi `<main>` membuat halaman baru tampil persis sama tanpa satu pun kelas
 * atau komponen digambar ulang — dan tetap ikut kalau template diperbarui.
 *
 * Isi `<main>` sengaja generik: tabel, toolbar, dan modal form dibangun saat
 * runtime oleh `padev-admin-crud.js` menurut konfigurasi tiap halaman. Jadi
 * empat modul memakai satu mesin yang sama, bukan empat salinan markup.
 *
 * Jalankan lewat `npm run build` — sudah dipanggil dari `scripts/build.mjs`.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(root, 'src', 'pages');

export const halaman = [
  {
    berkas: 'padev-inquiries.html',
    modul: 'inquiries',
    judul: 'Inquiry',
    eyebrow: 'Pesan masuk',
    deskripsi: 'Kiriman project brief dari halaman kontak website.',
  },
  {
    berkas: 'padev-articles.html',
    modul: 'articles',
    judul: 'Artikel',
    eyebrow: 'Insights',
    deskripsi: 'Tulisan yang tampil pada bagian Latest Insights di landing.',
  },
  {
    berkas: 'padev-projects.html',
    modul: 'projects',
    judul: 'Portfolio',
    eyebrow: 'Real projects',
    deskripsi: 'Karya yang tampil pada bagian Projects di landing.',
  },
  {
    berkas: 'padev-templates.html',
    modul: 'templates',
    judul: 'Template',
    eyebrow: 'Marketplace',
    deskripsi: 'Produk template beserta harganya pada bagian Templates.',
  },
];

export const halamanUm = [
  {
    berkas: 'padev-users.html',
    modul: 'users',
    judul: 'Pengguna',
    eyebrow: 'Administrasi',
    deskripsi: 'Izin melekat pada pengguna, bukan pada role-nya. Role hanya menentukan centang awal saat pengguna dibuat.',
  },
  {
    berkas: 'padev-user-groups.html',
    modul: 'user-groups',
    judul: 'Role &amp; grup',
    eyebrow: 'Administrasi',
    deskripsi: 'Role adalah <strong>template</strong>: ia menentukan izin apa yang tercentang saat pengguna baru dibuat. Role tidak pernah dibaca saat memutuskan sebuah request boleh berjalan, dan mengubah templatenya tidak mengubah izin pengguna yang sudah tersimpan.',
  },
  {
    berkas: 'padev-menu-permissions.html',
    modul: 'menus',
    judul: 'Menu &amp; izin',
    eyebrow: 'User Management',
    deskripsi: 'Susunan sidebar beserta izin yang menjaganya. Menu tampil bagi seseorang bila ia memegang izin <code>:read</code>-nya — tetapi yang menegakkan akses adalah route, bukan tampil atau tidaknya menu.',
  },
  {
    berkas: 'padev-profile.html',
    modul: 'profile',
    judul: 'Profil Saya',
    eyebrow: 'Akun',
    deskripsi: 'Identitas akun dan penggantian kata sandi.',
  },
];

/**
 * Halaman formulir User Management.
 *
 * Rujukan `api_bridge_gateway` memakai halaman tersendiri untuk tambah/ubah
 * (`user-form.ejs`, `user-group-form.ejs`, `menu-form.ejs`), bukan modal —
 * panel izin di dalamnya terlalu tinggi untuk dialog, dan alamatnya bisa
 * dibagikan. Susunan itu diikuti di sini.
 *
 * PENAMAAN BUKAN SELERA: berkasnya `<halaman-daftar>-form.html`. Penjaga
 * halaman di `_api_padev/src/app.js` menurunkan izin sebuah halaman form dari
 * nama daftarnya dengan membuang akhiran `-form`, jadi formulir selalu dijaga
 * izin yang sama persis dengan daftarnya tanpa satu pun entri baru di
 * `mst_menu` — form BUKAN menu.
 */
export const halamanUmForm = [
  { berkas: 'padev-users-form.html', modul: 'users', judul: 'Pengguna', daftar: 'padev-users.html' },
  { berkas: 'padev-user-groups-form.html', modul: 'user-groups', judul: 'Role & grup', daftar: 'padev-user-groups.html' },
  { berkas: 'padev-menu-permissions-form.html', modul: 'menus', judul: 'Menu & izin', daftar: 'padev-menu-permissions.html' },
];

const isiMain = (item) => `        <main id="konten-utama" class="mx-auto w-full max-w-container flex-1 p-4 md:p-6 xl:p-8"
              data-padev-module="${item.modul}">

            <section class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div class="min-w-0">
                    <p class="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">${item.eyebrow}</p>
                    <h1 class="page-title mt-1">${item.judul}</h1>
                    <p class="mt-2 text-sm text-ink-muted">${item.deskripsi}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2" data-padev-actions></div>
            </section>

            <section class="mt-6 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <label class="relative block">
                    <span class="sr-only">Cari</span>
                    <input type="search" class="ui-form-input" placeholder="Cari…" data-padev-search>
                </label>
                <select class="ui-form-input" data-padev-filter aria-label="Saring status"></select>
                <p class="text-sm text-ink-muted" data-padev-summary aria-live="polite"></p>
            </section>

            <section class="mt-4 rounded-xl border border-line bg-surface shadow-elevation-xs">
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-sm" data-padev-table>
                        <thead class="border-b border-line bg-canvas text-xs uppercase tracking-wide text-ink-muted">
                            <tr data-padev-head></tr>
                        </thead>
                        <tbody class="divide-y divide-line" data-padev-body></tbody>
                    </table>
                </div>
                <p class="hidden p-8 text-center text-sm text-ink-muted" data-padev-empty>Belum ada data.</p>
            </section>

        </main>`;

/**
 * Kerangka halaman daftar User Management.
 *
 * Susunan rujukan: satu `basic-section` membawa judul dan garis pemisah, lalu
 * body-nya berisi kartu metrik dan kartu tabel. Slot kanan header dipakai aksi
 * halaman — posisi yang sama dengan badge status pada komponen rujukan.
 */
const isiMainUm = (item) => `        <main id="konten-utama" class="mx-auto w-full max-w-container flex-1 p-4 md:p-6 xl:p-8"
              data-padev-um="${item.modul}">

            <section class="basic-section padev-table-section">
                <div class="basic-section-header">
                    <div>
                        <p class="basic-eyebrow">${item.eyebrow}</p>
                        <h2>${item.judul}</h2>
                        <p>${item.deskripsi}</p>
                    </div>
                    <div class="basic-section-actions" data-padev-actions></div>
                </div>
                <div class="basic-section-body" data-padev-panel></div>
            </section>

        </main>`;

/* ====================== Kerangka halaman formulir ======================
 *
 * Markup di bawah adalah salinan susunan rujukan, bukan hasil rendering
 * runtime: kartu, kelas, dan urutan fieldnya tetap, sehingga halaman sudah
 * benar bentuknya sebelum satu byte pun data tiba. `padev-admin-um-form.js`
 * hanya mengisi nilai, opsi, dan katalog izin — ia tidak menggambar kartu.
 */

const kepalaForm = (eyebrow, daftar) => `            <div class="page-heading">
                <div>
                    <p class="eyebrow">${eyebrow}</p>
                    <h1 data-form-title>Memuat…</h1>
                    <p class="muted" data-form-subtitle></p>
                </div>
                <a class="ui-button ui-button--secondary ui-button--sm" href="./${daftar}">Kembali</a>
            </div>`;

const kakiForm = (daftar) => `                <div class="form-actions">
                    <a class="ui-button ui-button--secondary" href="./${daftar}">Batal</a>
                    <button class="ui-button ui-button--primary" type="submit" data-loading-label="Menyimpan…" data-form-submit>Simpan</button>
                </div>`;

/** Panel izin: sama persis untuk formulir pengguna dan formulir role. */
const panelIzin = (judul, keterangan, tersembunyi) => `                <section class="card form-stack is-compact permission-panel" data-permission-panel${tersembunyi ? ' hidden' : ''}>
                    <div class="card-head">
                        <div>
                            <h2>${judul}</h2>
                            <p class="muted">${keterangan}</p>
                        </div>
                        <div class="table-actions">
                            <button class="ui-button ui-button--secondary ui-button--sm" type="button" data-permission-all>Centang semua</button>
                            <button class="ui-button ui-button--secondary ui-button--sm" type="button" data-permission-none>Bersihkan</button>
                        </div>
                    </div>
                    <div data-permission-catalog></div>
                </section>`;

const formPengguna = (item) => `${kepalaForm('User management', item.daftar)}

            <form class="stack" data-um-form="users" novalidate>
                <div class="user-form-grid">
                    <section class="card form-stack is-compact">
                        <h2>Identitas</h2>
                        <div class="form-grid">
                            <label>Nama lengkap
                                <input name="name" minlength="3" maxlength="150" required>
                                <span class="field-error" data-galat="name"></span>
                            </label>
                            <label>Nama masuk <small class="label-optional">(opsional)</small>
                                <input name="username" maxlength="150" placeholder="nama.pengguna" autocomplete="off">
                                <small>Nama pendek untuk dikenali di daftar. Login tetap memakai email.</small>
                                <span class="field-error" data-galat="username"></span>
                            </label>
                            <label>Email
                                <input name="email" type="email" maxlength="190" required autocomplete="off">
                                <small>Dipakai untuk masuk ke panel admin.</small>
                                <span class="field-error" data-galat="email"></span>
                            </label>
                            <label>Status
                                <select name="status">
                                    <option value="ACTIVE">Aktif</option>
                                    <option value="DISABLED">Nonaktif</option>
                                </select>
                            </label>
                        </div>
                    </section>

                    <section class="card form-stack is-compact">
                        <h2>Role &amp; kata sandi</h2>
                        <label>Role (template izin)
                            <select name="group_id" required data-group-select>
                                <option value="">— pilih role —</option>
                            </select>
                            <small>Role hanya menentukan centang awal. Yang berlaku adalah centang yang Anda simpan, jadi satu orang boleh diberi izin lebih dari rekan se-role-nya tanpa memengaruhi siapa pun.</small>
                            <span class="field-error" data-galat="group_id"></span>
                        </label>

                        <label data-mode="new" hidden>Kata sandi awal
                            <input name="password" type="password" minlength="10" autocomplete="new-password">
                            <small>Minimal 10 karakter. Yang disimpan hanya hash scrypt-nya.</small>
                            <span class="field-error" data-galat="password"></span>
                        </label>

                        <label class="switch-row" data-mode="edit" hidden>
                            <span>Ubah kata sandi pengguna ini</span>
                            <span class="account-switch"><input type="checkbox" data-password-toggle><i aria-hidden="true"></i></span>
                        </label>
                        <label data-password-field hidden>Kata sandi baru
                            <input name="new_password" type="password" minlength="10" autocomplete="new-password">
                            <small>Minimal 10 karakter. Seluruh sesi pengguna ini akan berakhir.</small>
                        </label>
                        <p class="muted" data-mode="edit" hidden>Menyunting nama, email, role, atau izin tidak memerlukan kata sandi.</p>
                    </section>
                </div>

${panelIzin('Izin pengguna', 'Inilah yang benar-benar dibaca saat memutuskan sebuah halaman atau tindakan boleh dijalankan. Arahkan kursor ke sebuah izin untuk melihat kunci teknisnya.', true)}

${kakiForm(item.daftar)}
            </form>`;

const formRole = (item) => `${kepalaForm('User management', item.daftar)}

            <form class="stack" data-um-form="user-groups" novalidate>
                <section class="card form-stack is-compact">
                    <h2>Identitas role</h2>
                    <div class="form-grid">
                        <label>Nama role
                            <input name="name" minlength="3" maxlength="150" required>
                            <span class="field-error" data-galat="name"></span>
                        </label>
                        <label>Kode role
                            <input name="slug" maxlength="80" placeholder="operator_konten" data-slug-field>
                            <small>Huruf kecil, angka, dan tanda hubung. Tidak dapat diubah setelah dibuat.</small>
                            <span class="field-error" data-galat="slug"></span>
                        </label>
                    </div>
                    <label>Deskripsi <small class="label-optional">(opsional)</small>
                        <input name="description" maxlength="255">
                    </label>
                </section>

${panelIzin('Template izin', 'Bawaan kanonik: seluruh izin aktif kecuali izin User Management. Dipakai sebagai centang awal saat pengguna baru memilih role ini; pengguna yang sudah ada tidak ikut berubah.', false)}

${kakiForm(item.daftar)}
            </form>`;

const formMenu = (item) => `${kepalaForm('Menu &amp; izin', item.daftar)}

            <form class="stack" data-um-form="menus" novalidate>
                <div class="user-form-grid">
                    <section class="card form-stack is-compact">
                        <h2>Identitas menu</h2>
                        <div class="form-grid">
                            <label>Label
                                <input name="label" minlength="2" maxlength="150" required placeholder="Laporan Bulanan">
                                <span class="field-error" data-galat="label"></span>
                            </label>
                            <label>Urutan
                                <input name="position" type="number" min="0" max="9999" value="999">
                                <small>Makin kecil makin atas.</small>
                            </label>
                        </div>
                        <label class="switch-row">
                            <span>Jadikan grup (pembuka submenu, tanpa halaman sendiri)</span>
                            <span class="account-switch"><input type="checkbox" data-menu-group><i aria-hidden="true"></i></span>
                        </label>
                        <label data-menu-path-field>Halaman yang ditautkan
                            <select name="path" data-menu-path>
                                <option value="">— pilih halaman —</option>
                            </select>
                            <small>Hanya halaman yang benar-benar terdaftar di aplikasi yang muncul di sini.</small>
                            <span class="field-error" data-galat="path"></span>
                        </label>
                        <label data-menu-parent-field>Induk <small class="label-optional">(opsional)</small>
                            <select name="parent_id" data-menu-parent>
                                <option value="">— tanpa induk, tampil di tingkat atas —</option>
                            </select>
                        </label>
                    </section>

                    <section class="card form-stack is-compact">
                        <h2>Tampilan</h2>
                        <p class="muted" data-menu-toplevel-note>Heading dan ikon hanya dipakai menu tingkat atas.</p>
                        <label>Heading di atas menu ini <small class="label-optional">(opsional)</small>
                            <input name="heading" data-menu-toplevel maxlength="100" placeholder="PA DEV Studio">
                            <small>Teks pemisah kelompok. Kosongkan bila tidak perlu.</small>
                        </label>
                        <label>Ikon <small class="label-optional">(opsional)</small>
                            <span class="icon-picker">
                                <span class="icon-preview" data-icon-preview aria-hidden="true">—</span>
                                <input type="hidden" name="icon" data-icon-value data-menu-toplevel value="">
                                <button class="ui-button ui-button--secondary ui-button--sm" type="button" data-icon-open data-menu-toplevel>Pilih ikon</button>
                                <button class="ui-button ui-button--secondary ui-button--sm" type="button" data-icon-clear data-menu-toplevel>Kosongkan</button>
                            </span>
                            <small>Dipilih dari galeri; tidak perlu menulis path SVG sendiri.</small>
                        </label>
                        <label class="switch-row">
                            <span>Tampilkan di sidebar</span>
                            <span class="account-switch"><input type="checkbox" name="enabled" checked><i aria-hidden="true"></i></span>
                        </label>
                    </section>
                </div>

                <section class="card form-stack is-compact permission-panel" data-menu-actions-panel>
                    <div class="card-head">
                        <div>
                            <h2>Izin yang dibuat menu ini</h2>
                            <p class="muted">Setiap aksi yang dicentang melahirkan satu izin bernama <code>path:aksi</code>. Aksi yang dicabut membuat izinnya ditandai usang — pemberiannya ke pengguna tetap utuh dan hidup lagi bila aksinya dikembalikan.</p>
                        </div>
                    </div>
                    <div class="check-list permission-list">
                        <label class="ui-choice"><input class="ui-choice-input" type="checkbox" name="actions" value="read" checked><span class="ui-choice-copy"><span class="ui-choice-label">Lihat</span></span></label>
                        <label class="ui-choice"><input class="ui-choice-input" type="checkbox" name="actions" value="create"><span class="ui-choice-copy"><span class="ui-choice-label">Tambah</span></span></label>
                        <label class="ui-choice"><input class="ui-choice-input" type="checkbox" name="actions" value="update"><span class="ui-choice-copy"><span class="ui-choice-label">Ubah</span></span></label>
                        <label class="ui-choice"><input class="ui-choice-input" type="checkbox" name="actions" value="delete"><span class="ui-choice-copy"><span class="ui-choice-label">Hapus</span></span></label>
                    </div>
                    <p class="muted permission-note">Izin User Management ditentukan dari path halamannya, bukan dari kotak centang — halaman pengguna, role, dan menu selalu terhitung sensitif.</p>
                </section>

${kakiForm(item.daftar)}
            </form>`;

const ISI_FORM = { users: formPengguna, 'user-groups': formRole, menus: formMenu };

const isiMainUmForm = (item) => `        <main id="konten-utama" class="mx-auto w-full max-w-container flex-1 p-4 md:p-6 xl:p-8"
              data-padev-um-form="${item.modul}">

${ISI_FORM[item.modul](item)}

        </main>`;

export const buatHalaman = async () => {
  const shellHtml = await readFile(path.join(pagesDir, 'dashboard.html'), 'utf8');

  const mulai = shellHtml.indexOf('        <main id="konten-utama"');
  const akhirTag = '</main>';
  const akhir = shellHtml.indexOf(akhirTag, mulai);
  if (mulai < 0 || akhir < 0) throw new Error('Struktur <main> pada dashboard.html tidak dikenali');

  const kepala = shellHtml.slice(0, mulai);
  const ekor = shellHtml.slice(akhir + akhirTag.length);

  /* Tiga jenis halaman, tiga kebutuhan berbeda.
   *
   * `padev-tables.css` hanya ditautkan halaman bertabel; `padev-um.css`
   * ditautkan seluruh halaman User Management karena daftar DAN formulirnya
   * sama-sama memakai komponennya. Skrip mengikuti aturan yang sama: mesin
   * tabel tidak ikut ke halaman formulir yang memang tidak punya tabel. */
  const JENIS = {
    konten: {
      daftar: halaman,
      main: isiMain,
      css: [],
      js: ['padev-admin-crud.js'],
    },
    umDaftar: {
      daftar: halamanUm,
      main: isiMainUm,
      css: ['padev-tables.css', 'padev-um.css'],
      // Mesin tabel dimuat SEBELUM `padev-admin-um.js`: keduanya `defer`, jadi
      // urutan tag menentukan urutan eksekusi, dan `padev-admin-um.js`
      // memanggil `window.PADevTables.mount()` segera setelah tabelnya digambar.
      js: ['padev-tables.js', 'padev-admin-um.js'],
    },
    umForm: {
      daftar: halamanUmForm,
      main: isiMainUmForm,
      css: ['padev-um.css'],
      js: ['padev-admin-um-form.js'],
    },
  };

  for (const jenis of Object.values(JENIS)) {
    for (const item of jenis.daftar) {
      const tautanCss = jenis.css
        .map((berkas) => `\n    <link rel="stylesheet" href="./assets/css/${berkas}">`)
        .join('');

      let html = kepala
        .replace(/<title>[^<]*<\/title>/, `<title>${item.judul} — PA DEV Studio</title>`)
        // Komponen di luar Tailwind ditautkan hanya oleh halaman yang
        // memakainya; lihat catatan di kepala kedua berkas CSS itu.
        .replace(
          '<link rel="stylesheet" href="./assets/css/app.css">',
          `<link rel="stylesheet" href="./assets/css/app.css">${tautanCss}`,
        )
        // Breadcrumb terakhir menunjuk halaman yang sedang dibuka. `data-i18n`
        // dilepas supaya auto-translate tidak mengembalikannya jadi "Dashboard".
        .replace(
          /<span class="truncate font-medium text-ink-heading" aria-current="page" data-i18n="nav.dashboard">Dashboard<\/span>/,
          `<span class="truncate font-medium text-ink-heading" aria-current="page">${item.judul}</span>`,
        );

      html += jenis.main(item);
      html += ekor.replace(
        '</body>',
        `${jenis.js.map((berkas) => `<script src="./assets/js/${berkas}" defer></script>`).join('\n')}\n</body>`,
      );

      await writeFile(path.join(pagesDir, item.berkas), html);
      console.log('halaman modul dibuat:', item.berkas);
    }
  }
};
