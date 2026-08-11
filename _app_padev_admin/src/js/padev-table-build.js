/**
 * Perakit markup tabel PA DEV — satu sumber untuk seluruh halaman daftar.
 *
 * Isi berkas ini adalah KONTRAK MARKUP `padev-tables.js`, disalin dari rujukan
 * `api_bridge_gateway` (`partials/padev-table-toolbar.ejs` dan `users.ejs`).
 * Di sana markupnya dicetak server; di sini datanya baru tiba setelah fetch,
 * jadi markup yang sama dibangun sebagai DOM lalu diserahkan ke mesin yang
 * sama, tanpa satu pun cabang khusus di dalam mesinnya.
 *
 * MENGAPA TERPISAH DARI PEMAKAINYA
 * Semula perakit ini tinggal di dalam `padev-admin-um.js`, sehingga halaman
 * modul konten menggambar toolbar, tabel, dan keadaan kosongnya sendiri. Dua
 * perakit untuk satu maksud selalu berakhir sebagai dua tampilan yang beda
 * sedikit, dan bedanya bertambah tiap halaman baru. Halaman kini cukup
 * menyatakan MAKSUD — kolom apa, baris apa, saringan apa — dan seluruh chrome
 * datang dari sini.
 *
 * Yang dikerjakan mesin dan TIDAK ditulis ulang oleh halaman: kolom pilih,
 * nomor baris, chevron detail, tombol urut, pencarian, saringan, pemilih
 * kolom, kerapatan, mode kartu, aksi massal, dan pagination.
 *
 * Dimuat SEBELUM skrip halaman; keduanya `defer`, jadi urutan tag menentukan
 * urutan eksekusi.
 */
'use strict';

(function initPadevTableBuild() {
  const el = (tag, kelas, isi) => {
    const n = document.createElement(tag);
    if (kelas) n.className = kelas;
    if (isi !== undefined) n.textContent = isi;
    return n;
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
  const tabel = ({ countLabel, cari, kolom, baris, filter = [], bulk = [], kirim, kelas = '', idPrefix = 'tabel' }) => {
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

      if (adaAksi) tr.append(selAksi(`aksi-${idPrefix}-${urutan}`, r.aksiLabel || 'Aksi baris', r.aksi || []));
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

  window.PADevTableBuild = Object.freeze({
    el,
    berIkon,
    inisial,
    tanggal,
    selAvatar,
    tautanAksi,
    aksi,
    selAksi,
    opsiSelect,
    tabel,
    BENTUK_IKON,
  });
})();
