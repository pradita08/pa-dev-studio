/**
 * Mesin CRUD untuk modul konten PA DEV Studio.
 *
 * Satu berkas melayani keempat halaman modul. Halaman hanya menyebutkan modul
 * mana yang dibuka lewat `data-padev-module`; sisanya — kolom tabel, isi form,
 * aturan unggah gambar — didefinisikan di sini.
 *
 * Alasannya sama seperti di sisi API: empat salinan markup dan logika yang
 * hampir sama akan pelan-pelan berbeda satu sama lain.
 *
 * Seluruh kelas diambil dari kosakata tema PA DEV Admin — `ui-button`,
 * `ui-form-input`, `ui-modal`, `ui-table-status`, `ui-toast` — tanpa satu pun
 * CSS baru, supaya halaman modul tidak terlihat asing di antara 145 halaman
 * bawaan template.
 */
'use strict';

(function initPadevCrud() {
  const main = document.querySelector('[data-padev-module]');
  if (!main) return;

  const modul = main.dataset.padevModule;
  const api = `/api/admin/${modul}`;

  /* ============================ Definisi modul ============================ */

  const kolomGambar = [
    { name: 'image_light', label: 'Gambar mode terang', type: 'image' },
    { name: 'image_dark', label: 'Gambar mode gelap', type: 'image' },
  ];

  const statusKonten = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Terbit' },
  ];

  const DEFINISI = {
    articles: {
      judul: 'Artikel',
      status: statusKonten,
      kolom: [
        { name: 'image_light', label: '', render: 'thumbnail' },
        { name: 'title', label: 'Judul', render: 'judul', sub: 'slug' },
        { name: 'category', label: 'Kategori' },
        { name: 'published_at', label: 'Terbit', render: 'tanggal' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'title', label: 'Judul', type: 'text', required: true },
        { name: 'category', label: 'Kategori', type: 'text', required: true, placeholder: 'Web Development' },
        { name: 'excerpt', label: 'Ringkasan', type: 'textarea', rows: 2 },
        { name: 'body', label: 'Isi tulisan', type: 'textarea', rows: 6 },
        ...kolomGambar,
        { name: 'status', label: 'Status', type: 'select', options: statusKonten },
        { name: 'position', label: 'Urutan', type: 'number' },
      ],
    },

    projects: {
      judul: 'Portfolio',
      status: statusKonten,
      kolom: [
        { name: 'image_light', label: '', render: 'thumbnail' },
        { name: 'title', label: 'Proyek', render: 'judul', sub: 'slug' },
        { name: 'tag', label: 'Kategori' },
        { name: 'stack', label: 'Teknologi' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'title', label: 'Nama proyek', type: 'text', required: true },
        { name: 'tag', label: 'Kategori', type: 'text', required: true, placeholder: 'Dashboard' },
        { name: 'summary', label: 'Ringkasan', type: 'textarea', rows: 3 },
        { name: 'stack', label: 'Teknologi', type: 'text', placeholder: 'Next.js, TypeScript', bantuan: 'Pisahkan dengan koma.' },
        { name: 'url', label: 'Tautan', type: 'text', placeholder: 'https://…' },
        ...kolomGambar,
        { name: 'status', label: 'Status', type: 'select', options: statusKonten },
        { name: 'position', label: 'Urutan', type: 'number' },
      ],
    },

    templates: {
      judul: 'Template',
      status: statusKonten,
      kolom: [
        { name: 'image_light', label: '', render: 'thumbnail' },
        { name: 'title', label: 'Template', render: 'judul', sub: 'slug' },
        { name: 'type', label: 'Tipe' },
        { name: 'price_cents', label: 'Harga', render: 'harga' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'title', label: 'Nama template', type: 'text', required: true },
        { name: 'type', label: 'Tipe', type: 'text', required: true, placeholder: 'SaaS' },
        { name: 'stack', label: 'Teknologi', type: 'text', placeholder: 'Next.js, Tailwind CSS' },
        // Harga disimpan dalam sen di database; konversi terjadi di form ini.
        { name: 'price', label: 'Harga', type: 'number', step: '0.01', bantuan: 'Dalam USD, contoh 49 atau 49.50.' },
        { name: 'url', label: 'Tautan pembelian', type: 'text', placeholder: 'https://…' },
        ...kolomGambar,
        { name: 'status', label: 'Status', type: 'select', options: statusKonten },
        { name: 'position', label: 'Urutan', type: 'number' },
      ],
    },

    inquiries: {
      judul: 'Inquiry',
      hanyaBaca: true,
      status: [
        { value: 'new', label: 'Baru' },
        { value: 'read', label: 'Dibaca' },
        { value: 'replied', label: 'Dibalas' },
        { value: 'archived', label: 'Diarsipkan' },
      ],
      kolom: [
        { name: 'name', label: 'Pengirim', render: 'judul', sub: 'email' },
        { name: 'service', label: 'Layanan' },
        { name: 'message', label: 'Pesan', render: 'potong' },
        { name: 'created_at', label: 'Masuk', render: 'tanggal' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'name', label: 'Pengirim', type: 'text', readOnly: true },
        { name: 'email', label: 'Email', type: 'text', readOnly: true },
        { name: 'service', label: 'Layanan', type: 'text', readOnly: true },
        { name: 'message', label: 'Pesan', type: 'textarea', rows: 6, readOnly: true },
        { name: 'status', label: 'Status', type: 'select' },
        { name: 'note', label: 'Catatan internal', type: 'textarea', rows: 2 },
      ],
    },
  };

  const def = DEFINISI[modul];
  if (!def) return;
  def.form.filter((f) => f.type === 'select' && !f.options).forEach((f) => { f.options = def.status; });

  /* ============================== Bantuan ============================== */

  const el = (tag, kelas, isi) => {
    const node = document.createElement(tag);
    if (kelas) node.className = kelas;
    if (isi !== undefined) node.textContent = isi;
    return node;
  };

  const minta = async (url, opsi = {}) => {
    const response = await fetch(url, { credentials: 'same-origin', ...opsi });
    if (response.status === 401) {
      window.location.replace(`/auth/?next=${encodeURIComponent(window.location.pathname)}`);
      throw new Error('Sesi berakhir');
    }
    const isi = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(isi?.message || 'Permintaan gagal');
      error.errors = isi?.errors || {};
      throw error;
    }
    return isi;
  };

  const labelStatus = (nilai) => def.status.find((s) => s.value === nilai)?.label || nilai || '—';

  const nadaStatus = (nilai) => ({
    published: 'ui-table-status is-success', replied: 'ui-table-status is-success',
    draft: 'ui-table-status is-neutral', archived: 'ui-table-status is-neutral',
    new: 'ui-table-status is-success', read: 'ui-table-status is-warning',
  }[nilai] || 'ui-table-status is-neutral');

  const tanggal = (nilai) => (nilai
    ? new Date(nilai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—');

  const rupiahDollar = (sen) => `$${(Number(sen || 0) / 100).toFixed(2).replace(/\.00$/, '')}`;

  // Toast memakai region dan kelas milik tema, bukan kotak mengambang buatan
  // sendiri, supaya posisi dan animasinya sama dengan notifikasi lain.
  const toastRegion = el('div', 'ui-toast-region');
  toastRegion.setAttribute('aria-live', 'polite');
  document.body.append(toastRegion);

  const toast = (pesan, jenis = 'success') => {
    const kotak = el('article', `ui-toast ui-feedback--${jenis}`);
    kotak.setAttribute('role', jenis === 'danger' ? 'alert' : 'status');
    const isi = el('div');
    isi.append(el('strong', null, jenis === 'danger' ? 'Gagal' : 'Berhasil'), el('p', null, pesan));
    kotak.append(isi);
    toastRegion.append(kotak);
    window.setTimeout(() => kotak.remove(), 3600);
  };

  /* =============================== Tabel =============================== */

  const tbody = main.querySelector('[data-padev-body]');
  const thead = main.querySelector('[data-padev-head]');
  const kosong = main.querySelector('[data-padev-empty]');
  const ringkasan = main.querySelector('[data-padev-summary]');
  const pencarian = main.querySelector('[data-padev-search]');
  const saringan = main.querySelector('[data-padev-filter]');
  const aksi = main.querySelector('[data-padev-actions]');

  def.kolom.forEach((kolom) => {
    thead.append(el('th', 'whitespace-nowrap px-4 py-3 font-semibold', kolom.label));
  });
  thead.append(el('th', 'px-4 py-3 text-right font-semibold', 'Aksi'));

  saringan.append(new Option('Semua status', ''));
  def.status.forEach((s) => saringan.append(new Option(s.label, s.value)));

  if (!def.hanyaBaca) {
    const tombol = el('button', 'ui-button ui-button--primary ui-button--sm', `Tambah ${def.judul}`);
    tombol.type = 'button';
    tombol.addEventListener('click', () => bukaForm(null));
    aksi.append(tombol);
  }

  const selGambar = (baris) => {
    const wrap = el('span', 'flex h-10 w-14 items-center justify-center overflow-hidden rounded-lg bg-canvas');
    if (baris.image_light) {
      const img = document.createElement('img');
      img.src = baris.image_light;
      img.alt = '';
      img.className = 'h-full w-full object-cover';
      img.loading = 'lazy';
      wrap.append(img);
    }
    return wrap;
  };

  const selJudul = (baris, kolom) => {
    const wrap = el('span', 'grid min-w-0');
    wrap.append(el('span', 'truncate font-medium text-ink-heading', baris[kolom.name] || '—'));
    if (kolom.sub) wrap.append(el('span', 'truncate text-xs text-ink-muted', baris[kolom.sub] || ''));
    return wrap;
  };

  const gambarBaris = (data) => {
    tbody.replaceChildren();
    kosong.classList.toggle('hidden', data.length > 0);

    data.forEach((baris) => {
      const tr = el('tr', 'align-middle');

      def.kolom.forEach((kolom) => {
        const td = el('td', 'px-4 py-3');
        const nilai = baris[kolom.name];

        switch (kolom.render) {
          case 'thumbnail': td.append(selGambar(baris)); break;
          case 'judul': td.append(selJudul(baris, kolom)); break;
          case 'status': {
            const badge = el('span', nadaStatus(nilai), labelStatus(nilai));
            td.append(badge);
            break;
          }
          case 'tanggal': td.textContent = tanggal(nilai); break;
          case 'harga': td.textContent = rupiahDollar(nilai); break;
          case 'potong': {
            const teks = String(nilai || '');
            td.className = 'px-4 py-3 text-ink-muted';
            td.textContent = teks.length > 70 ? `${teks.slice(0, 70)}…` : teks;
            break;
          }
          default: td.textContent = nilai || '—';
        }
        tr.append(td);
      });

      const tdAksi = el('td', 'px-4 py-3');
      const grup = el('div', 'flex justify-end gap-2');

      const ubah = el('button', 'ui-button ui-button--ghost ui-button--sm', def.hanyaBaca ? 'Tinjau' : 'Ubah');
      ubah.type = 'button';
      ubah.addEventListener('click', () => bukaForm(baris));
      grup.append(ubah);

      if (!def.hanyaBaca) {
        const hapus = el('button', 'ui-button ui-button--ghost ui-button--sm', 'Hapus');
        hapus.type = 'button';
        hapus.addEventListener('click', () => hapusBaris(baris));
        grup.append(hapus);
      }

      tdAksi.append(grup);
      tr.append(tdAksi);
      tbody.append(tr);
    });
  };

  let permintaanTerakhir = 0;

  const muat = async () => {
    const nomor = ++permintaanTerakhir;
    const params = new URLSearchParams();
    if (pencarian.value.trim()) params.set('q', pencarian.value.trim());
    if (saringan.value) params.set('status', saringan.value);

    try {
      const hasil = await minta(`${api}?${params}`);
      // Balasan yang datang terlambat diabaikan supaya hasil ketikan lama
      // tidak menimpa hasil ketikan terbaru.
      if (nomor !== permintaanTerakhir) return;
      gambarBaris(hasil.data);
      const rincian = Object.entries(hasil.ringkasan || {})
        .map(([status, jumlah]) => `${labelStatus(status)} ${jumlah}`)
        .join(' · ');
      ringkasan.textContent = `${hasil.total} data${rincian ? ` — ${rincian}` : ''}`;
    } catch (error) {
      toast(error.message, 'danger');
    }
  };

  let jedaKetik;
  pencarian.addEventListener('input', () => {
    window.clearTimeout(jedaKetik);
    jedaKetik = window.setTimeout(muat, 300);
  });
  saringan.addEventListener('change', muat);

  /* ============================ Form modal ============================ */

  // Susunan overlay meniru markup modal template: lapisan + backdrop +
  // <section class="ui-modal">. Dengan begitu ukuran, animasi masuk, dan gaya
  // header/footer datang dari CSS tema, tidak ditulis ulang di sini.
  const overlay = el('div', 'ui-overlay-layer');
  overlay.hidden = true;
  const backdrop = el('div', 'ui-overlay-backdrop');
  const panel = el('section', 'ui-modal ui-modal--lg');
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-modal', 'true');
  overlay.append(backdrop, panel);
  document.body.append(overlay);

  const tutup = () => {
    overlay.hidden = true;
    panel.replaceChildren();
  };

  backdrop.addEventListener('click', tutup);
  window.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !overlay.hidden) tutup(); });

  /**
   * Kotak unggah gambar.
   *
   * Berkas dikirim ke server begitu dipilih, bukan menunggu form disimpan.
   * Dengan begitu admin langsung melihat pratinjau berkas yang benar-benar
   * tersimpan, bukan pratinjau lokal yang ternyata gagal diunggah.
   */
  const kotakGambar = (field, nilaiAwal) => {
    const wrap = el('label');
    wrap.append(el('span', null, field.label));

    const kotak = el('div', 'flex items-center gap-3 rounded-pa-md border border-dashed border-line bg-canvas p-3');
    const pratinjau = el('span', 'flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-canvas text-xs text-ink-muted', 'Kosong');
    const kanan = el('div', 'grid gap-1');

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/avif';
    input.className = 'ui-upload-input';

    const tersembunyi = document.createElement('input');
    tersembunyi.type = 'hidden';
    tersembunyi.name = field.name;
    tersembunyi.value = nilaiAwal || '';

    const status = el('span', 'text-xs text-ink-muted', 'PNG, JPG, WebP, atau AVIF — maksimal 4 MB.');
    const galat = el('p', 'hidden text-xs text-danger');

    const tampilkan = (url) => {
      pratinjau.replaceChildren();
      if (!url) {
        pratinjau.textContent = 'Kosong';
        return;
      }
      const img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.className = 'h-full w-full object-cover';
      pratinjau.append(img);
    };

    tampilkan(nilaiAwal);

    input.addEventListener('change', async () => {
      const berkas = input.files?.[0];
      if (!berkas) return;
      galat.classList.add('hidden');
      status.textContent = 'Mengunggah…';

      const data = new FormData();
      data.append('file', berkas);
      data.append('variant', field.name.includes('dark') ? 'dark' : 'light');

      try {
        const hasil = await minta('/api/admin/uploads', { method: 'POST', body: data });
        tersembunyi.value = hasil.url;
        tampilkan(hasil.url);
        status.textContent = `Terunggah — ${(hasil.size / 1024).toFixed(0)} KB`;
      } catch (error) {
        status.textContent = 'PNG, JPG, WebP, atau AVIF — maksimal 4 MB.';
        galat.textContent = error.message;
        galat.classList.remove('hidden');
        input.value = '';
      }
    });

    kanan.append(input, status, galat);
    kotak.append(pratinjau, kanan);
    wrap.append(kotak, tersembunyi);
    wrap.dataset.padevField = field.name;
    return wrap;
  };

  const kotakBiasa = (field, nilaiAwal) => {
    const wrap = el('label');
    wrap.dataset.padevField = field.name;
    wrap.append(el('span', null, field.label));

    let kontrol;
    if (field.type === 'textarea') {
      kontrol = document.createElement('textarea');
      kontrol.rows = field.rows || 3;
      
    } else if (field.type === 'select') {
      kontrol = document.createElement('select');
      
      field.options.forEach((o) => kontrol.append(new Option(o.label, o.value)));
    } else {
      kontrol = document.createElement('input');
      kontrol.type = field.type === 'number' ? 'number' : 'text';
      if (field.step) kontrol.step = field.step;
      
      if (field.placeholder) kontrol.placeholder = field.placeholder;
    }

    kontrol.name = field.name;
    if (nilaiAwal !== undefined && nilaiAwal !== null && nilaiAwal !== '') kontrol.value = nilaiAwal;
    else if (field.type !== 'select') kontrol.value = '';
    if (field.readOnly) {
      kontrol.readOnly = true;
      kontrol.disabled = field.type === 'select' ? false : kontrol.disabled;
      kontrol.classList.add('bg-canvas', 'text-ink-muted');
    }

    wrap.append(kontrol);
    if (field.bantuan) wrap.append(el('small', 'text-ink-muted', field.bantuan));
    wrap.append(el('p', 'hidden text-xs text-danger'));
    return wrap;
  };

  function bukaForm(baris) {
    const sunting = Boolean(baris);
    panel.replaceChildren();

    const kepala = document.createElement('header');
    const teksKepala = el('div');
    teksKepala.append(
      el('p', null, def.judul),
      el('h2', null, sunting ? `${def.hanyaBaca ? 'Tinjau' : 'Ubah'} ${def.judul}` : `Tambah ${def.judul}`),
    );
    const tombolTutup = el('button', null, '×');
    tombolTutup.type = 'button';
    tombolTutup.setAttribute('aria-label', 'Tutup');
    tombolTutup.addEventListener('click', tutup);
    kepala.append(teksKepala, tombolTutup);

    const form = document.createElement('form');
    form.noValidate = true;
    const badan = el('div', 'ui-modal-body ui-modal-form');

    def.form.forEach((field) => {
      let awal = baris ? baris[field.name] : '';
      // Harga tampil dalam dolar walau tersimpan sebagai sen.
      if (field.name === 'price') awal = baris ? (Number(baris.price_cents || 0) / 100) : '';
      badan.append(field.type === 'image' ? kotakGambar(field, awal) : kotakBiasa(field, awal));
    });

    const kaki = document.createElement('footer');
    const batal = el('button', null, 'Batal');
    batal.type = 'button';
    batal.addEventListener('click', tutup);
    const simpan = el('button', 'is-primary', 'Simpan');
    simpan.type = 'submit';
    kaki.append(batal, simpan);
    form.append(badan, kaki);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      form.querySelectorAll('[data-padev-field] p').forEach((p) => p.classList.add('hidden'));

      const data = Object.fromEntries(new FormData(form).entries());
      if ('price' in data) {
        data.price_cents = Math.round(Number(data.price || 0) * 100);
        delete data.price;
      }

      simpan.disabled = true;
      simpan.textContent = 'Menyimpan…';

      try {
        await minta(sunting ? `${api}/${baris.id}` : api, {
          method: sunting ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        tutup();
        toast(sunting ? 'Perubahan tersimpan.' : `${def.judul} ditambahkan.`);
        muat();
      } catch (error) {
        simpan.disabled = false;
        simpan.textContent = 'Simpan';
        // Pesan galat ditempel di kolomnya masing-masing, bukan ditumpuk di atas.
        Object.entries(error.errors || {}).forEach(([nama, pesan]) => {
          const slot = form.querySelector(`[data-padev-field="${nama}"] p`);
          if (slot) {
            slot.textContent = pesan;
            slot.classList.remove('hidden');
          }
        });
        toast(error.message, 'danger');
      }
    });

    panel.append(kepala, form);
    overlay.hidden = false;
    form.querySelector('input, textarea, select')?.focus();
  }

  const hapusBaris = async (baris) => {
    const nama = baris.title || baris.name;
    if (!window.confirm(`Hapus "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      await minta(`${api}/${baris.id}`, { method: 'DELETE' });
      toast(`${def.judul} dihapus.`);
      muat();
    } catch (error) {
      toast(error.message, 'danger');
    }
  };

  muat();
}());
