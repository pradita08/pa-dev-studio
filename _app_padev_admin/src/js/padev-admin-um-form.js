/**
 * Halaman FORMULIR User Management: tambah dan ubah pengguna, role, dan menu.
 *
 * Susunannya menyalin rujukan `api_bridge_gateway` (`views/user-form.ejs`,
 * `user-group-form.ejs`, `menu-form.ejs`) beserta perilaku `admin-ui.js`-nya.
 * Bedanya satu: di sana markup dicetak server lengkap dengan nilainya, di sini
 * markup sudah ada di halaman dan berkas ini hanya mengisi nilai, opsi, dan
 * katalog izin. Kartu tidak pernah digambar dari JavaScript — bentuk halaman
 * tidak bergantung pada berhasil-tidaknya sebuah fetch.
 *
 * TIGA ATURAN PADF-UM-001 YANG DITEGAKKAN DI SINI:
 *
 *  1. Kontrol izin DISEMBUNYIKAN sampai sebuah role dipilih. Sebelum ada
 *     template, tidak ada dasar untuk menyodorkan centang apa pun.
 *  2. Centang bawaan TIDAK mencakup User Management. Server mengirim
 *     `defaults` terpisah dari `template`; yang memberi kewenangan mengelola
 *     pengguna harus manusia, secara sadar.
 *  3. Menyunting pengguna TIDAK meminta kata sandi dan tidak pernah menimpanya.
 *     Penggantian kata sandi adalah niat tersendiri, dinyatakan lewat saklar.
 *
 * Mengganti role pada pengguna YANG SUDAH ADA hanya menampilkan panelnya, tidak
 * pernah menimpa centang yang tersimpan — hanya pilihan yang disimpan secara
 * eksplisit yang boleh mengubah kewenangan seseorang (PADF-UM-001 pasal 4).
 */
'use strict';

(function initUserManagementForm() {
  const main = document.querySelector('[data-padev-um-form]');
  if (!main) return;

  const modul = main.dataset.padevUmForm;
  const form = main.querySelector('[data-um-form]');
  const id = new URLSearchParams(window.location.search).get('id');
  const sunting = Boolean(id);

  const judul = main.querySelector('[data-form-title]');
  const subjudul = main.querySelector('[data-form-subtitle]');
  const tombolSimpan = main.querySelector('[data-form-submit]');

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
      window.location.replace(`/auth/?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
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
  toastRegion.dataset.padevToastRegion = 'true';
  toastRegion.setAttribute('aria-live', 'polite');
  document.body.append(toastRegion);

  const toast = (pesan, jenis = 'danger') => {
    if (window.PADevToast) return window.PADevToast(pesan, jenis === 'danger' ? 'error' : jenis);
    const k = el('article', `ui-toast ui-feedback--${jenis}`);
    k.setAttribute('role', jenis === 'danger' ? 'alert' : 'status');
    const isi = el('div');
    isi.append(el('strong', null, jenis === 'danger' ? 'Gagal' : 'Berhasil'), el('p', null, pesan));
    k.append(isi);
    toastRegion.append(k);
    window.setTimeout(() => k.remove(), 5000);
  };

  const isi = (nama, nilai) => {
    const kontrol = form.elements[nama];
    if (!kontrol) return;
    if (kontrol.type === 'checkbox') kontrol.checked = Boolean(nilai);
    else kontrol.value = nilai ?? '';
  };

  const nilai = (nama) => {
    const kontrol = form.elements[nama];
    if (!kontrol) return '';
    return kontrol.type === 'checkbox' ? kontrol.checked : String(kontrol.value || '').trim();
  };

  const bersihkanGalat = () => main.querySelectorAll('[data-galat]').forEach((n) => { n.textContent = ''; });

  const tampilkanGalat = (errors) => {
    Object.entries(errors || {}).forEach(([nama, pesan]) => {
      const slot = main.querySelector(`[data-galat="${nama}"]`);
      if (slot) slot.textContent = pesan;
    });
  };

  const opsi = (select, daftar, { kosong } = {}) => {
    select.replaceChildren();
    if (kosong !== undefined) select.append(new Option(kosong, ''));
    daftar.forEach((o) => select.append(new Option(o.label, String(o.value))));
  };

  /** `data-mode="new"|"edit"`: hanya yang cocok dengan keadaan halaman tampil. */
  const terapkanMode = () => {
    main.querySelectorAll('[data-mode]').forEach((n) => {
      n.hidden = n.dataset.mode !== (sunting ? 'edit' : 'new');
    });
  };

  /* ============================ Panel izin ============================
   *
   * Susunan rujukan: satu `fieldset` per kelompok halaman, kunci teknis di
   * `title` (bukan di bawah tiap kotak — itu membuat setiap izin memakan dua
   * baris dan satu halaman izin saja sudah menuntut gulir panjang).
   */

  const wadahIzin = main.querySelector('[data-permission-catalog]');
  const panelIzin = main.querySelector('[data-permission-panel]');

  const gambarKatalog = (katalog, terpilih) => {
    if (!wadahIzin) return;
    const dipilih = new Set(terpilih || []);
    const perKelompok = new Map();
    katalog.forEach((izin) => {
      if (!perKelompok.has(izin.group_label)) perKelompok.set(izin.group_label, []);
      perKelompok.get(izin.group_label).push(izin);
    });

    const potongan = document.createDocumentFragment();
    for (const [kelompok, daftar] of perKelompok) {
      const sensitif = Boolean(daftar[0].is_user_management);
      const fs = el('fieldset', 'permission-group');
      const legend = el('legend', null, kelompok);
      if (sensitif) {
        legend.append(' ');
        legend.append(el('span', 'ui-table-status is-warning', 'sensitif'));
      }
      fs.append(legend);

      const daftarEl = el('div', 'check-list permission-list');
      daftar.forEach((izin) => {
        const label = el('label', 'ui-choice');
        label.title = izin.key;
        const cek = document.createElement('input');
        cek.type = 'checkbox';
        cek.className = 'ui-choice-input';
        cek.name = 'permissions';
        cek.value = izin.key;
        cek.checked = dipilih.has(izin.key);
        cek.setAttribute('data-permission', '');
        const salinan = el('span', 'ui-choice-copy');
        salinan.append(el('span', 'ui-choice-label', izin.label));
        label.append(cek, salinan);
        daftarEl.append(label);
      });
      fs.append(daftarEl);

      if (sensitif) {
        fs.append(el('p', 'muted permission-note',
          'Tidak aktif pada template bawaan. Berikan hanya kepada pengguna yang memang mengelola akun.'));
      }
      potongan.append(fs);
    }
    wadahIzin.replaceChildren(potongan);
  };

  const kotakIzin = () => [...main.querySelectorAll('[data-permission]:not(:disabled)')];
  const izinTerpilih = () => kotakIzin().filter((k) => k.checked).map((k) => k.value);

  main.querySelector('[data-permission-all]')?.addEventListener('click', () => {
    kotakIzin().forEach((k) => { k.checked = true; });
  });
  main.querySelector('[data-permission-none]')?.addEventListener('click', () => {
    kotakIzin().forEach((k) => { k.checked = false; });
  });

  /* ============================== Pengguna ============================== */

  const siapkanPengguna = async () => {
    const [{ data: role }, rinci] = await Promise.all([
      minta('/api/admin/user-groups'),
      sunting ? minta(`/api/admin/users/${id}`).then((r) => r.data) : null,
    ]);

    const pilihRole = form.querySelector('[data-group-select]');
    opsi(pilihRole, role.map((g) => ({ value: g.id, label: g.name })), { kosong: '— pilih role —' });

    judul.textContent = sunting ? rinci.name : 'Tambah pengguna';
    subjudul.textContent = sunting
      ? 'Izin di bawah milik pengguna ini. Menyimpan tidak menyentuh kata sandi kecuali saklarnya dinyalakan.'
      : 'Pilih role dulu — izin muncul dengan centang awal dari template role, lalu boleh disesuaikan.';
    tombolSimpan.textContent = sunting ? 'Simpan perubahan' : 'Buat pengguna';
    terapkanMode();

    if (sunting) {
      isi('name', rinci.name);
      isi('username', rinci.username);
      isi('email', rinci.email);
      isi('status', rinci.status);
      pilihRole.value = rinci.group_id ? String(rinci.group_id) : '';
      // Pengguna yang sudah ada: katalog penuh dengan centang MILIKNYA, bukan
      // template role-nya. Panelnya langsung terbuka — role-nya pasti terisi.
      const { data: katalog } = await minta('/api/admin/permissions');
      gambarKatalog(katalog, rinci.permissions);
      panelIzin.hidden = false;
    } else {
      form.elements.password.required = true;
    }

    /* Aturan 1 + aturan 4. Untuk pengguna BARU role menentukan centang awal;
     * untuk pengguna yang sudah ada ia hanya membuka panelnya. */
    pilihRole.addEventListener('change', async () => {
      if (sunting) { panelIzin.hidden = !pilihRole.value; return; }
      if (!pilihRole.value) { panelIzin.hidden = true; return; }
      try {
        const t = await minta(`/api/admin/permission-template?group_id=${encodeURIComponent(pilihRole.value)}`);
        gambarKatalog(t.catalog, t.defaults);
        panelIzin.hidden = false;
      } catch (error) {
        toast(error.message);
      }
    });

    // Kata sandi baru muncul setelah niat mengubahnya dinyatakan, sehingga
    // suntingan biasa tidak pernah tampak seperti menuntut kata sandi.
    const saklar = main.querySelector('[data-password-toggle]');
    const bidangSandi = main.querySelector('[data-password-field]');
    if (saklar && bidangSandi) {
      const kontrol = bidangSandi.querySelector('input');
      const sinkron = () => {
        bidangSandi.hidden = !saklar.checked;
        kontrol.required = saklar.checked;
        if (!saklar.checked) kontrol.value = '';
      };
      saklar.addEventListener('change', sinkron);
      sinkron();
    }
  };

  const simpanPengguna = async () => {
    const payload = {
      name: nilai('name'),
      username: nilai('username') || null,
      email: nilai('email'),
      status: nilai('status'),
      group_id: nilai('group_id') || null,
      permissions: izinTerpilih(),
    };
    if (!sunting) payload.password = form.elements.password.value;
    else if (main.querySelector('[data-password-toggle]')?.checked) {
      payload.password = form.elements.new_password.value;
    }

    await minta(sunting ? `/api/admin/users/${id}` : '/api/admin/users', {
      method: sunting ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    return sunting ? 'Pengguna diperbarui.' : 'Pengguna ditambahkan.';
  };

  /* =============================== Role =============================== */

  const siapkanRole = async () => {
    const [{ data: katalog }, rinci] = await Promise.all([
      minta('/api/admin/permissions'),
      sunting ? minta(`/api/admin/user-groups/${id}`).then((r) => r.data) : null,
    ]);

    judul.textContent = sunting ? rinci.name : 'Tambah role';
    subjudul.textContent = sunting
      ? 'Izin yang dicentang di sini menjadi centang awal pada formulir pengguna baru. Pengguna yang sudah ada tidak ikut berubah saat template disimpan.'
      : 'Role adalah template izin. Ia tidak pernah dibaca saat memutuskan sebuah request boleh berjalan.';
    tombolSimpan.textContent = sunting ? 'Simpan template' : 'Buat role';

    if (sunting) {
      isi('name', rinci.name);
      isi('slug', rinci.slug);
      isi('description', rinci.description);
      // Kode role adalah identitas yang sudah dipakai; mengubahnya berarti
      // memutus rujukan yang sudah ada, jadi ia dikunci setelah dibuat.
      form.elements.slug.disabled = true;
    }
    gambarKatalog(katalog, sunting ? rinci.permissions : []);
  };

  const simpanRole = async () => {
    const payload = {
      name: nilai('name'),
      description: nilai('description') || null,
      permissions: izinTerpilih(),
    };
    if (!sunting) payload.slug = nilai('slug') || undefined;

    await minta(sunting ? `/api/admin/user-groups/${id}` : '/api/admin/user-groups', {
      method: sunting ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    return sunting ? 'Role diperbarui.' : 'Role ditambahkan.';
  };

  /* =============================== Menu ===============================
   *
   * Grup tidak menautkan halaman, jadi pilihan path, induk, dan aksinya
   * disembunyikan saat grup dinyalakan. Kunci menu TIDAK diketik di sini: ia
   * diturunkan server dari path (atau label, untuk grup).
   */

  const IKON_MENU = [
    ['Dashboard', 'M3 10.5 12 3l9 7.5M5 9.75V21h14V9.75M10 21v-6h4v6'],
    ['Database', 'M4 6h16v5H4zM4 15h16v3H4zM8 8.5h.01M8 16.5h.01'],
    ['Dokumen', 'M4 5h16v14H4zM8 9h8M8 13h5'],
    ['Kunci', 'M15 7a4 4 0 1 0-3.5 4H21M18 11v3M15 11v2'],
    ['Grafik', 'M6 3h12v18H6zM9 8h6M9 12h6M9 16h4'],
    ['Pengguna', 'M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20M9.5 10.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M18 8v6M21 11h-6'],
    ['Folder', 'M3 7h6l2 2h10v10H3z'],
    ['Kalender', 'M4 6h16v14H4zM8 3v4M16 3v4M4 11h16'],
    ['Laporan', 'M7 3h10l3 4v14H4V7zM8 12h8M8 16h5'],
    ['Setelan', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M4 12h2M18 12h2M12 4v2M12 18v2'],
    ['Perisai', 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z'],
    ['Server', 'M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01'],
    ['Bel', 'M6 9a6 6 0 1 1 12 0v5l2 3H4l2-3z M10 20h4'],
    ['Petir', 'M13 3 5 14h6l-1 7 8-11h-6z'],
    ['Kotak', 'M12 3l9 5v8l-9 5-9-5V8z M3 8l9 5 9-5 M12 13v8'],
    ['Tautan', 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 1 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 1 0 6 6l1-1'],
  ];

  const svgIkon = (d) => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', d);
    svg.append(path);
    return svg;
  };

  const siapkanMenu = async () => {
    const [{ data: semua }, { data: path }] = await Promise.all([
      minta('/api/admin/menus'), minta('/api/admin/menu-paths'),
    ]);
    const rinci = sunting ? semua.find((m) => String(m.id) === String(id)) : null;
    if (sunting && !rinci) throw new Error('Menu tidak ditemukan.');

    judul.textContent = sunting ? rinci.label : 'Tambah menu';
    subjudul.textContent = 'Menu adalah tautan, bukan halaman — membuat menu tidak membuat halaman. Karena itu path hanya boleh menunjuk halaman yang sudah dibangun.';
    tombolSimpan.textContent = sunting ? 'Simpan menu' : 'Buat menu';

    const pilihPath = form.querySelector('[data-menu-path]');
    const pilihInduk = form.querySelector('[data-menu-parent]');
    const saklarGrup = form.querySelector('[data-menu-group]');

    // Path yang sudah dipakai menu lain tidak ditawarkan: satu halaman satu
    // menu, dan server memang menolak yang kedua.
    const terpakai = new Set(semua.filter((m) => m.path && m.id !== rinci?.id).map((m) => m.path));
    opsi(
      pilihPath,
      path.filter((p) => !terpakai.has(p) || p === rinci?.path).map((p) => ({ value: p, label: p })),
      { kosong: '— pilih halaman —' },
    );
    opsi(
      pilihInduk,
      semua.filter((m) => !m.parent_id && m.id !== rinci?.id).map((m) => ({ value: m.id, label: m.label })),
      { kosong: '— tanpa induk, tampil di tingkat atas —' },
    );

    const ikonNilai = form.querySelector('[data-icon-value]');
    const ikonPratinjau = form.querySelector('[data-icon-preview]');

    const sinkronIkon = () => {
      ikonPratinjau.replaceChildren();
      if (!ikonNilai.value) { ikonPratinjau.textContent = '—'; return; }
      ikonPratinjau.append(svgIkon(ikonNilai.value));
    };

    if (sunting) {
      isi('label', rinci.label);
      isi('position', rinci.position);
      isi('heading', rinci.heading);
      isi('enabled', Boolean(rinci.enabled));
      ikonNilai.value = rinci.icon || '';
      pilihPath.value = rinci.path || '';
      pilihInduk.value = rinci.parent_id ? String(rinci.parent_id) : '';
      saklarGrup.checked = !rinci.path;
      form.querySelectorAll('input[name="actions"]').forEach((k) => {
        k.checked = (rinci.actions || []).includes(k.value);
      });
    }

    const panelAksi = main.querySelector('[data-menu-actions-panel]');
    const bidangPath = form.querySelector('[data-menu-path-field]');
    const bidangInduk = form.querySelector('[data-menu-parent-field]');
    const catatan = form.querySelector('[data-menu-toplevel-note]');

    const sinkronMenu = () => {
      const grup = saklarGrup.checked;
      bidangPath.hidden = grup;
      panelAksi.hidden = grup;
      pilihPath.required = !grup;
      if (grup) pilihPath.value = '';
      // Sidebar hanya dua tingkat: grup selalu berada di tingkat atas, jadi
      // pilihan induknya tidak punya arti dan ikut disembunyikan.
      bidangInduk.hidden = grup;
      if (grup) pilihInduk.value = '';

      // Heading dan ikon hanya dipakai menu tingkat atas. DINONAKTIFKAN, bukan
      // disembunyikan: field yang hilang-timbul membuat tinggi kartu melompat
      // setiap kali induknya diganti.
      const tingkatAtas = grup || !pilihInduk.value;
      form.querySelectorAll('[data-menu-toplevel]').forEach((k) => { k.disabled = !tingkatAtas; });
      catatan.textContent = tingkatAtas
        ? 'Heading dan ikon hanya dipakai menu tingkat atas.'
        : 'Menu ini berada di dalam grup, jadi heading dan ikon tidak dipakai.';
      sinkronIkon();
    };

    saklarGrup.addEventListener('change', sinkronMenu);
    pilihPath.addEventListener('change', sinkronMenu);
    pilihInduk.addEventListener('change', sinkronMenu);

    // Galeri ikon: nilainya diambil dari daftar tertutup di berkas ini, tidak
    // pernah diketik bebas, karena path itu masuk langsung ke atribut `d`.
    const galeri = bukaGaleri(ikonNilai, sinkronIkon);
    form.querySelector('[data-icon-open]').addEventListener('click', () => { galeri.hidden = false; });
    form.querySelector('[data-icon-clear]').addEventListener('click', () => {
      ikonNilai.value = '';
      sinkronIkon();
    });

    sinkronMenu();
  };

  const bukaGaleri = (ikonNilai, sesudahPilih) => {
    const overlay = el('div', 'ui-overlay-layer');
    overlay.hidden = true;
    const backdrop = el('div', 'ui-overlay-backdrop');
    const kotak = el('section', 'ui-modal ui-modal--lg');
    kotak.setAttribute('role', 'dialog');
    kotak.setAttribute('aria-modal', 'true');

    const header = document.createElement('header');
    const teks = el('div');
    teks.append(el('p', null, 'Galeri'), el('h2', null, 'Pilih ikon menu'));
    const tutup = el('button', null, '×');
    tutup.type = 'button';
    tutup.setAttribute('aria-label', 'Tutup');
    tutup.addEventListener('click', () => { overlay.hidden = true; });
    header.append(teks, tutup);

    const badan = el('div', 'ui-modal-body');
    const grid = el('div', 'icon-grid');
    IKON_MENU.forEach(([nama, d]) => {
      const t = el('button', 'icon-option');
      t.type = 'button';
      t.title = nama;
      t.append(svgIkon(d), el('span', null, nama));
      t.addEventListener('click', () => {
        ikonNilai.value = d;
        sesudahPilih();
        overlay.hidden = true;
      });
      grid.append(t);
    });
    badan.append(grid);

    kotak.append(header, badan);
    overlay.append(backdrop, kotak);
    backdrop.addEventListener('click', () => { overlay.hidden = true; });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.hidden = true; });
    document.body.append(overlay);
    return overlay;
  };

  const simpanMenu = async () => {
    const grup = form.querySelector('[data-menu-group]').checked;
    const payload = {
      label: nilai('label'),
      path: grup ? null : (nilai('path') || null),
      heading: nilai('heading') || null,
      parent_id: grup ? null : (nilai('parent_id') || null),
      position: Number(nilai('position')) || 0,
      enabled: form.elements.enabled.checked,
      icon: form.querySelector('[data-icon-value]').value || null,
      actions: grup ? [] : [...form.querySelectorAll('input[name="actions"]:checked')].map((k) => k.value),
    };

    await minta(sunting ? `/api/admin/menus/${id}` : '/api/admin/menus', {
      method: sunting ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    });
    return sunting ? 'Menu diperbarui.' : 'Menu ditambahkan.';
  };

  /* ============================== Jalankan ============================== */

  const PETA = {
    users: { siapkan: siapkanPengguna, simpan: simpanPengguna },
    'user-groups': { siapkan: siapkanRole, simpan: simpanRole },
    menus: { siapkan: siapkanMenu, simpan: simpanMenu },
  };

  const halaman = PETA[modul];
  if (!halaman) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    bersihkanGalat();
    const semula = tombolSimpan.textContent;
    const labelMemuat = tombolSimpan.dataset.loadingLabel || 'Menyimpan…';
    const memakaiFeedback = Boolean(window.PADevButton?.busy(tombolSimpan, labelMemuat));
    if (!memakaiFeedback) {
      tombolSimpan.disabled = true;
      tombolSimpan.textContent = labelMemuat;
    }
    try {
      const pesan = await halaman.simpan();
      toast(pesan, 'success');
    } catch (error) {
      tampilkanGalat(error.errors);
      toast(error.message);
    } finally {
      if (memakaiFeedback) window.PADevButton.idle(tombolSimpan);
      else {
        tombolSimpan.disabled = false;
        tombolSimpan.textContent = semula;
      }
    }
  });

  halaman.siapkan().catch((error) => {
    judul.textContent = 'Tidak dapat dimuat';
    subjudul.textContent = error.message;
    form.hidden = true;
  });
}());
