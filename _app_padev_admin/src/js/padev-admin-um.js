/**
 * Halaman DAFTAR User Management: Pengguna, Role & Grup, Menu & Izin, Profil.
 *
 * Susunannya menyalin rujukan `api_bridge_gateway` (`views/users.ejs`,
 * `user-groups.ejs`, `menu-permissions.ejs`): kartu metrik di atas, lalu kartu
 * tabel yang dikemudikan `padev-tables.js`, di dalam satu `basic-section`.
 *
 * FORMULIR TIDAK ADA DI BERKAS INI. Tambah dan ubah pindah ke halaman
 * tersendiri (`padev-*-form.html`, dikemudikan `padev-admin-um-form.js`),
 * sama seperti rujukannya. Yang tersisa di sini hanyalah dialog ganti kata
 * sandi milik halaman Profil — itu tindakan layanan-diri, bukan formulir CRUD.
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
    const r = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(opsi.body ? { 'Content-Type': 'application/json' } : {}) },
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

  /* ====================== Dialog (khusus Profil) ====================== */

  const overlay = el('div', 'ui-overlay-layer');
  overlay.hidden = true;
  const backdrop = el('div', 'ui-overlay-backdrop');
  const kotak = el('section', 'ui-modal ui-modal--md');
  kotak.setAttribute('role', 'dialog');
  kotak.setAttribute('aria-modal', 'true');
  overlay.append(backdrop, kotak);
  document.body.append(overlay);

  const tutup = () => { overlay.hidden = true; kotak.replaceChildren(); };
  backdrop.addEventListener('click', tutup);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !overlay.hidden) tutup(); });

  const bukaModal = (eyebrow, judul, isiForm, onSubmit, labelSimpan = 'Simpan') => {
    kotak.replaceChildren();
    const header = document.createElement('header');
    const teks = el('div');
    teks.append(el('p', null, eyebrow), el('h2', null, judul));
    const tombolX = el('button', null, '×');
    tombolX.type = 'button';
    tombolX.setAttribute('aria-label', 'Tutup');
    tombolX.addEventListener('click', tutup);
    header.append(teks, tombolX);

    const form = document.createElement('form');
    form.noValidate = true;
    const badan = el('div', 'ui-modal-body ui-modal-form');
    isiForm(badan, form);

    const footer = document.createElement('footer');
    const batal = el('button', null, 'Batal');
    batal.type = 'button';
    batal.addEventListener('click', tutup);
    const simpan = el('button', 'is-primary', labelSimpan);
    simpan.type = 'submit';
    footer.append(batal, simpan);
    form.append(badan, footer);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      form.querySelectorAll('[data-galat]').forEach((p) => { p.textContent = ''; p.classList.add('hidden'); });
      simpan.disabled = true;
      const semula = simpan.textContent;
      simpan.textContent = 'Menyimpan…';
      try {
        await onSubmit(new FormData(form), form);
        tutup();
      } catch (error) {
        simpan.disabled = false;
        simpan.textContent = semula;
        Object.entries(error.errors || {}).forEach(([nama, pesan]) => {
          const slot = form.querySelector(`[data-galat="${nama}"]`);
          if (slot) { slot.textContent = pesan; slot.classList.remove('hidden'); }
        });
        toast(error.message, 'danger');
      }
    });

    kotak.append(header, form);
    overlay.hidden = false;
    form.querySelector('input, select, textarea')?.focus();
  };

  const bidang = (nama, label, { tipe = 'text', bantuan = '', wajib = false } = {}) => {
    const wrap = el('label');
    wrap.append(el('span', null, label));
    const kontrol = document.createElement('input');
    kontrol.type = tipe;
    if (tipe === 'password') kontrol.autocomplete = 'new-password';
    kontrol.name = nama;
    if (wajib) kontrol.required = true;
    wrap.append(kontrol);
    if (bantuan) wrap.append(el('small', 'text-ink-muted', bantuan));
    const galat = el('p', 'hidden text-xs text-danger');
    galat.dataset.galat = nama;
    wrap.append(galat);
    return wrap;
  };

  /* ========================= Tabel PA DEV =========================
   *
   * Markup di bawah adalah kontrak `padev-tables.js`, disalin dari rujukan
   * `api_bridge_gateway` (`partials/padev-table-toolbar.ejs` dan `users.ejs`).
   * Di sana ia dicetak server; di sini datanya baru tiba setelah fetch, jadi
   * markupnya dibangun sebagai DOM lalu diserahkan ke mesin yang sama.
   *
   * Yang dikerjakan mesin dan TIDAK ditulis ulang di sini: kolom pilih, nomor
   * baris, chevron detail, tombol urut, pencarian, saringan, pemilih kolom,
   * kerapatan, mode kartu, aksi massal, dan pagination. Halaman hanya
   * menyatakan maksud lewat atribut — `data-sort`, `data-detail`,
   * `data-sort-value`, `data-search`, dan `data-bulk-*`.
   */

  const BENTUK_IKON = {
    arrow: '<path d="M5 12h13M13 6l6 6-6 6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
    eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>',
    settings: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/><circle cx="12" cy="12" r="3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  };

  /**
   * Elemen berisi satu SVG. Seluruh bentuk di berkas ini literal tetap yang
   * ditulis di sini, bukan data dari server — tidak ada yang bisa disuntikkan
   * lewat `innerHTML` ini.
   */
  const berIkon = (tag, kelas, bentuk, atribut = {}) => {
    const n = document.createElement(tag);
    if (kelas) n.className = kelas;
    if (tag === 'button') n.type = 'button';
    if (bentuk) n.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${bentuk}</svg>`;
    Object.entries(atribut).forEach(([nama, nilai]) => n.setAttribute(nama, nilai));
    return n;
  };

  const inisial = (nama) => String(nama || '?').trim().split(/\s+/).slice(0, 2)
    .map((bagian) => bagian.charAt(0).toUpperCase()).join('');

  const tanggal = (nilai) => (nilai
    ? new Date(nilai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
    : 'Belum');

  /** Sel nama + baris kedua kecil, susunan avatar rujukan. */
  const selAvatar = (nama, keterangan, nada = '') => {
    const wrap = el('span', 'ui-avatar-cell');
    const avatar = el('span', `ui-table-avatar${nada ? ` is-${nada}` : ''}`, inisial(nama));
    avatar.setAttribute('aria-hidden', 'true');
    const teks = el('span');
    teks.append(el('strong', null, nama));
    if (keterangan) teks.append(el('small', null, keterangan));
    wrap.append(avatar, teks);
    return wrap;
  };

  /** Satu item menu aksi berupa tautan — susunan rujukan untuk "Ubah". */
  const tautanAksi = (label, href, { bentuk = 'edit' } = {}) => {
    const a = berIkon('a', 'ui-table-action-menu-link', null, { role: 'menuitem', href });
    a.append(berIkon('span', 'ui-table-action-icon', BENTUK_IKON[bentuk], { 'data-icon': bentuk, 'aria-hidden': 'true' }));
    a.append(el('span', 'ui-table-action-label', label));
    return a;
  };

  /** Satu item menu aksi berupa tombol. API di sini JSON, bukan form. */
  const aksi = (label, { bentuk = 'arrow', nada = '', onClick }) => {
    const b = berIkon('button', `ui-table-action-menu-item${nada ? ` is-${nada}` : ''}`, null, { role: 'menuitem' });
    b.append(berIkon('span', 'ui-table-action-icon', BENTUK_IKON[bentuk], { 'data-icon': bentuk, 'aria-hidden': 'true' }));
    b.append(el('span', 'ui-table-action-label', label));
    b.addEventListener('click', onClick);
    return b;
  };

  const selAksi = (id, labelAria, daftar) => {
    const td = el('td', 'ui-table-action-cell ui-table-sticky-action');
    if (daftar.length === 0) return td;
    const bungkus = el('div', 'ui-table-action');
    const tombolPemicu = berIkon(
      'button',
      'ui-table-action-trigger',
      '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
      { 'data-action-trigger': '', 'aria-label': labelAria, 'aria-haspopup': 'menu', 'aria-expanded': 'false', 'aria-controls': id },
    );

    const menu = el('div', 'ui-table-action-menu');
    menu.id = id;
    menu.setAttribute('data-action-menu', '');
    menu.setAttribute('role', 'menu');
    menu.hidden = true;
    daftar.forEach((item) => menu.append(item));
    bungkus.append(tombolPemicu, menu);
    td.append(bungkus);
    return td;
  };

  const opsiSelect = (select, daftar, labelKosong) => {
    select.append(new Option(labelKosong, ''));
    daftar.forEach((o) => select.append(new Option(o.label, o.value)));
  };

  const toolbarTabel = (akar, { countLabel, cari, filter, bulk }) => {
    const sejajar = filter[0] || null;
    const lanjutan = filter.slice(1);

    const toolbar = el('div', 'ui-table-toolbar padev-table-toolbar');
    toolbar.setAttribute('data-padev-toolbar', '');
    toolbar.dataset.padevCountLabel = countLabel;

    const labelCari = berIkon('label', 'ui-table-search', '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>');
    labelCari.prepend(el('span', 'sr-only', cari));
    const isian = document.createElement('input');
    isian.type = 'search';
    isian.placeholder = cari;
    isian.autocomplete = 'off';
    isian.setAttribute('data-padev-search', '');
    labelCari.append(isian);
    toolbar.append(labelCari);

    if (sejajar) {
      const l = el('label', 'ui-table-filter');
      l.append(el('span', 'sr-only', sejajar.label));
      const s = document.createElement('select');
      s.dataset.padevFilter = sejajar.key;
      s.dataset.padevMatch = sejajar.match || 'exact';
      opsiSelect(s, sejajar.options, sejajar.label);
      l.append(s);
      toolbar.append(l);
    }

    if (lanjutan.length) {
      const tombolFilter = berIkon('button', 'ui-table-tool-button', '<path d="M4 6h16M7 12h10M10 18h4"/>', {
        'data-padev-filter-toggle': '', 'aria-expanded': 'false',
      });
      tombolFilter.append('Filter');
      toolbar.append(tombolFilter);
    }

    const view = el('details', 'ui-table-settings');
    view.setAttribute('data-padev-view', '');
    const ringkas = berIkon('summary', 'ui-table-tool-button', '<path d="M5 7h14M5 12h14M5 17h14"/>');
    ringkas.append('Tampilan');
    const panelView = el('div', 'ui-table-settings-panel');

    const fsKolom = document.createElement('fieldset');
    fsKolom.setAttribute('data-padev-columns', '');
    // Paragraf ini dibuang mesin saat daftar kolom pertama disisipkan.
    fsKolom.append(el('legend', null, 'Kolom'), el('p', 'text-ink-muted', 'Memuat kolom…'));

    const fsKerapatan = document.createElement('fieldset');
    fsKerapatan.append(el('legend', null, 'Kerapatan'));
    const saklar = el('div', 'ui-density-switch');
    saklar.setAttribute('role', 'group');
    saklar.setAttribute('aria-label', 'Kerapatan tabel');
    [['comfortable', 'Normal', true], ['compact', 'Rapat', false]].forEach(([nilai, label, aktif]) => {
      const b = el('button', aktif ? 'is-active' : null, label);
      b.type = 'button';
      b.dataset.padevDensity = nilai;
      b.setAttribute('aria-pressed', String(aktif));
      saklar.append(b);
    });
    fsKerapatan.append(saklar);
    panelView.append(fsKolom, fsKerapatan);
    view.append(ringkas, panelView);
    toolbar.append(view);

    const tombolKartu = berIkon('button', 'ui-table-tool-button', '<path d="M4 5h16v5H4zM4 14h16v5H4z"/>', {
      'data-padev-cards': '', 'aria-pressed': 'false',
    });
    tombolKartu.append('Kartu');
    toolbar.append(tombolKartu);

    const hitung = el('span', 'ui-table-result', `— ${countLabel}`);
    hitung.setAttribute('data-padev-count', '');
    hitung.setAttribute('aria-live', 'polite');
    toolbar.append(hitung);

    const rows = el('label', 'ui-table-page-size');
    rows.append(el('span', null, 'Baris'));
    const pilihRows = document.createElement('select');
    pilihRows.setAttribute('data-padev-page-size', '');
    pilihRows.setAttribute('aria-label', 'Baris per halaman');
    [5, 10, 25, 50].forEach((n) => pilihRows.append(new Option(String(n), String(n), n === 10, n === 10)));
    rows.append(pilihRows);
    toolbar.append(rows);
    akar.append(toolbar);

    if (lanjutan.length) {
      const panelFilter = el('div', 'ui-table-advanced-filter padev-table-filter-panel');
      panelFilter.setAttribute('data-padev-filter-panel', '');
      panelFilter.hidden = true;
      lanjutan.forEach((f) => {
        const l = document.createElement('label');
        l.append(el('span', null, f.label));
        const s = document.createElement('select');
        s.dataset.padevFilter = f.key;
        s.dataset.padevMatch = f.match || 'exact';
        opsiSelect(s, f.options, 'Semua');
        l.append(s);
        panelFilter.append(l);
      });
      const aksiPanel = el('div');
      const reset = el('button', 'ui-button ui-button--primary ui-button--sm', 'Reset');
      reset.type = 'button';
      reset.setAttribute('data-padev-filter-reset', '');
      aksiPanel.append(reset);
      panelFilter.append(aksiPanel);
      akar.append(panelFilter);
    }

    if (bulk.length) {
      const bar = el('div', 'ui-table-bulk');
      bar.setAttribute('data-padev-bulk', '');
      bar.hidden = true;
      const jumlah = el('span', null, `0 ${countLabel} dipilih`);
      jumlah.setAttribute('data-padev-bulk-count', '');
      jumlah.setAttribute('aria-live', 'polite');
      const kontrol = el('div', 'ui-table-bulk-controls');
      bulk.forEach((b) => {
        const t = el('button', b.nada === 'danger' ? 'is-danger' : null, b.label);
        t.type = 'button';
        t.dataset.padevBulkAction = b.key;
        t.dataset.padevBulkConfirm = b.konfirmasi;
        kontrol.append(t);
      });
      const bersih = el('button', null, 'Bersihkan pilihan');
      bersih.type = 'button';
      bersih.setAttribute('data-padev-bulk-clear', '');
      kontrol.append(bersih);
      bar.append(jumlah, kontrol);
      akar.append(bar);
    }
  };

  const kakiTabel = (akar) => {
    const ringkasan = el('div', 'ui-table-footer-summary');
    ringkasan.setAttribute('data-padev-summary', '');
    ringkasan.setAttribute('aria-live', 'polite');

    const pager = el('div', 'ui-table-pagination padev-table-pagination');
    pager.setAttribute('data-padev-pager', '');
    const teks = el('span', null, 'Menampilkan 0 dari 0');
    teks.setAttribute('data-padev-page-summary', '');
    teks.setAttribute('aria-live', 'polite');
    const tombolHalaman = el('div');
    tombolHalaman.setAttribute('data-page-buttons', '');
    [['data-padev-prev', 'Halaman sebelumnya', '<path d="m15 18-6-6 6-6"/>'],
      ['data-padev-next', 'Halaman berikutnya', '<path d="m9 18 6-6-6-6"/>']].forEach(([atribut, label, bentuk]) => {
      tombolHalaman.append(berIkon('button', null, bentuk, { [atribut]: '', 'aria-label': label }));
    });
    pager.append(teks, tombolHalaman);
    akar.append(ringkasan, pager);
  };

  /**
   * @param kolom  [{ label, urut, detail }]
   * @param baris  [{ kunci, cari, bulk, sel, aksi, aksiLabel }]
   *               `sel` boleh string, Node, atau { isi, urut } bila nilai yang
   *               diurutkan berbeda dari yang ditampilkan.
   */
  const tabel = ({ countLabel, cari, kolom, baris, filter = [], bulk = [], kirim, kelas = '' }) => {
    const akar = el('section', `ui-table-card padev-table${kelas ? ` ${kelas}` : ''}`);
    akar.setAttribute('data-padev-table', '');
    toolbarTabel(akar, { countLabel, cari, filter, bulk });

    const gulir = el('div', 'ui-table-scroll');
    const t = el('table', 'ui-table ui-table--hover');

    const thead = document.createElement('thead');
    const trh = document.createElement('tr');
    kolom.forEach((k) => {
      const th = el('th', null, k.label);
      if (k.urut !== false) th.setAttribute('data-sort', '');
      if (k.detail) th.setAttribute('data-detail', '');
      trh.append(th);
    });
    const adaAksi = baris.some((r) => (r.aksi || []).length);
    if (adaAksi) trh.append(el('th', 'ui-table-action-cell ui-table-sticky-action', 'Aksi'));
    thead.append(trh);

    const tbody = document.createElement('tbody');
    if (baris.length === 0) {
      const tr = document.createElement('tr');
      tr.setAttribute('data-table-empty', '');
      const td = el('td', 'empty', 'Belum ada data.');
      td.colSpan = kolom.length + (adaAksi ? 1 : 0);
      tr.append(td);
      tbody.append(tr);
    }

    baris.forEach((r, urutan) => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-row', '');
      Object.entries(r.kunci || {}).forEach(([nama, nilai]) => { tr.dataset[nama] = nilai ?? ''; });
      tr.dataset.search = String(r.cari || '').toLowerCase();
      Object.entries(r.bulk || {}).forEach(([nama, nilai]) => { tr.dataset[nama] = nilai; });

      r.sel.forEach((sel) => {
        const td = el('td');
        const isi = sel && typeof sel === 'object' && !(sel instanceof Node) ? sel.isi : sel;
        if (sel && typeof sel === 'object' && !(sel instanceof Node)) {
          if (sel.urut !== undefined) td.dataset.sortValue = String(sel.urut);
          if (sel.kelas) td.className = sel.kelas;
        }
        if (isi instanceof Node) td.append(isi);
        else td.textContent = isi ?? '—';
        tr.append(td);
      });

      if (adaAksi) tr.append(selAksi(`aksi-${modul}-${urutan}`, r.aksiLabel || 'Aksi baris', r.aksi || []));
      tbody.append(tr);
    });

    t.append(thead, tbody);
    gulir.append(t);
    akar.append(gulir);
    kakiTabel(akar);

    // Dipasang setelah akar berada di dokumen: `syncStickyOffset` mengukur
    // tinggi baris header, dan elemen yang belum terpasang selalu nol.
    window.requestAnimationFrame(() => window.PADevTables?.mount(akar, { kirim }));
    return akar;
  };

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

  const halamanProfil = async () => {
    const { user } = await minta('/api/auth/me');
    aksiBar.replaceChildren(tombol('Ubah kata sandi', 'primary', formKataSandiSendiri));

    const kartu = el('div', 'grid gap-4 rounded-xl border border-line bg-surface p-5 shadow-elevation-xs md:grid-cols-2');
    [['Nama', user.name], ['Email', user.email], ['Role', user.role],
      ['Jumlah izin', `${user.permissions.length} izin`]].forEach(([label, nilai]) => {
      const b = el('div', 'grid gap-1');
      b.append(el('span', 'text-xs uppercase tracking-wide text-ink-muted', label),
        el('span', 'text-sm font-medium text-ink-heading', nilai));
      kartu.append(b);
    });

    const daftarIzin = el('div', 'mt-4 rounded-xl border border-line bg-surface p-5 shadow-elevation-xs');
    daftarIzin.append(el('p', 'mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted', 'Izin yang Anda pegang'));
    const chip = el('div', 'flex flex-wrap gap-2');
    user.permissions.slice().sort().forEach((k) => chip.append(el('span', 'ui-table-status is-neutral', k)));
    daftarIzin.append(chip);

    panel.replaceChildren(kartu, daftarIzin);
  };

  const formKataSandiSendiri = () => {
    bukaModal('Akun', 'Ubah kata sandi', (badan) => {
      badan.append(
        bidang('current_password', 'Kata sandi saat ini', { tipe: 'password', wajib: true }),
        bidang('new_password', 'Kata sandi baru', { tipe: 'password', wajib: true, bantuan: 'Minimal 10 karakter.' }),
      );
    }, async (data) => {
      const hasil = await minta('/api/admin/me/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: data.get('current_password'),
          new_password: data.get('new_password'),
        }),
      });
      toast(hasil.message);
    }, 'Ubah');
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
