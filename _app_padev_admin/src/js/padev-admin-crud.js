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
        { name: 'body', label: 'Isi tulisan', type: 'textarea', rows: 10, rich: true },
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
        { name: 'price_amount', label: 'Harga', render: 'harga' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'title', label: 'Nama template', type: 'text', required: true },
        { name: 'type', label: 'Tipe', type: 'text', required: true, placeholder: 'SaaS' },
        { name: 'stack', label: 'Teknologi', type: 'text', placeholder: 'Next.js, Tailwind CSS' },
        { name: 'price_amount', label: 'Harga', type: 'number', min: 0, bantuan: 'Satuan penuh mata uangnya, contoh 49 atau 2500000.' },
        { name: 'currency', label: 'Mata uang', type: 'select', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'IDR', label: 'IDR (Rp)' }, { value: 'EUR', label: 'EUR (€)' }] },
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

    testimonials: {
      judul: 'Testimoni',
      status: statusKonten,
      kolom: [
        { name: 'avatar', label: '', render: 'thumbnail', inisialDari: 'author_name' },
        { name: 'author_name', label: 'Nama', render: 'judul', sub: 'company' },
        { name: 'quote', label: 'Kutipan', render: 'potong' },
        { name: 'rating', label: 'Rating', render: 'rating' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'author_name', label: 'Nama', type: 'text', required: true },
        { name: 'author_role', label: 'Jabatan', type: 'text', placeholder: 'CTO' },
        { name: 'company', label: 'Perusahaan', type: 'text' },
        { name: 'quote', label: 'Kutipan', type: 'textarea', rows: 4, required: true },
        { name: 'rating', label: 'Rating (1–5)', type: 'number', bantuan: 'Bintang yang ditampilkan pada kartu.' },
        { name: 'avatar', label: 'Foto', type: 'image' },
        { name: 'status', label: 'Status', type: 'select', options: statusKonten },
        { name: 'position', label: 'Urutan', type: 'number' },
      ],
    },

    companies: {
      judul: 'Company',
      status: statusKonten,
      kolom: [
        { name: 'name', label: 'Nama company', render: 'judul', sub: 'url' },
        { name: 'url', label: 'Tautan website', render: 'potong' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'name', label: 'Nama company', type: 'text', required: true, placeholder: 'Nama yang tampil pada trust strip' },
        { name: 'url', label: 'Tautan website', type: 'url', required: true, placeholder: 'https://contoh.id/' },
        { name: 'status', label: 'Status', type: 'select', options: statusKonten },
        { name: 'position', label: 'Urutan', type: 'number' },
      ],
    },

    faq: {
      judul: 'FAQ',
      status: statusKonten,
      kolom: [
        { name: 'question', label: 'Pertanyaan', render: 'judul', sub: 'category' },
        { name: 'answer', label: 'Jawaban', render: 'potong' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'question', label: 'Pertanyaan', type: 'text', required: true },
        { name: 'answer', label: 'Jawaban', type: 'textarea', rows: 5, required: true },
        { name: 'category', label: 'Kategori', type: 'text', placeholder: 'Umum' },
        { name: 'status', label: 'Status', type: 'select', options: statusKonten },
        { name: 'position', label: 'Urutan', type: 'number' },
      ],
    },

    services: {
      judul: 'Paket',
      status: statusKonten,
      kolom: [
        { name: 'title', label: 'Paket', render: 'judul', sub: 'tagline' },
        { name: 'price_amount', label: 'Harga', render: 'hargaPaket' },
        { name: 'deliverables', label: 'Isi paket', render: 'potong' },
        { name: 'is_featured', label: 'Unggulan', render: 'unggulan' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        { name: 'title', label: 'Nama paket', type: 'text', required: true, placeholder: 'Professional' },
        { name: 'tagline', label: 'Keterangan singkat', type: 'text', placeholder: 'Best for growing businesses' },
        { name: 'description', label: 'Deskripsi', type: 'textarea', rows: 4 },
        { name: 'deliverables', label: 'Isi paket', type: 'text', bantuan: 'Pisahkan dengan koma. Tiap bagian tampil sebagai baris bercentang.' },
        { name: 'price_amount', label: 'Harga', type: 'number', min: 0, bantuan: 'Satuan penuh mata uangnya, contoh 199 atau 2500000.' },
        { name: 'currency', label: 'Mata uang', type: 'select', options: [{ value: 'USD', label: 'USD ($)' }, { value: 'IDR', label: 'IDR (Rp)' }, { value: 'EUR', label: 'EUR (€)' }] },
        { name: 'price_label', label: 'Harga sebagai teks', type: 'text', placeholder: 'Custom', bantuan: 'Isi hanya bila harganya bukan angka. Kalau terisi, harga angka diabaikan.' },
        { name: 'price_suffix', label: 'Keterangan harga', type: 'text', placeholder: '/project' },
        { name: 'cta_label', label: 'Label tombol', type: 'text', placeholder: 'Get Started' },
        { name: 'cta_url', label: 'Tautan tombol', type: 'text', placeholder: '#contact' },
        { name: 'is_featured', label: 'Tandai unggulan', type: 'select', options: [{ value: '0', label: 'Tidak' }, { value: '1', label: 'Ya — tampil sebagai Most Popular' }] },
        { name: 'status', label: 'Status', type: 'select', options: statusKonten },
        { name: 'position', label: 'Urutan', type: 'number' },
      ],
    },

    subscribers: {
      judul: 'Subscriber',
      status: [
        { value: 'active', label: 'Aktif' },
        { value: 'unsubscribed', label: 'Berhenti' },
      ],
      kolom: [
        { name: 'email', label: 'Email', render: 'judul', sub: 'name' },
        { name: 'source', label: 'Sumber' },
        { name: 'created_at', label: 'Terdaftar', render: 'tanggal' },
        { name: 'status', label: 'Status', render: 'status' },
      ],
      form: [
        // Ketiganya hanya bacaan saat menyunting: server pun hanya menerima
        // `status` dan `note` (lihat `adminEditable`). Menampilkannya sebagai
        // field aktif akan menjanjikan perubahan yang diam-diam dibuang.
        { name: 'email', label: 'Email', type: 'text', required: true, readOnlyOnEdit: true },
        { name: 'name', label: 'Nama', type: 'text', readOnlyOnEdit: true },
        { name: 'source', label: 'Sumber', type: 'text', placeholder: 'landing-footer', readOnlyOnEdit: true },
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

  const formatHarga = (jumlah, mataUang = 'USD') => {
    const nilai = Number(jumlah || 0);
    const simbol = { USD: '$', IDR: 'Rp', EUR: '€' }[mataUang] || '';
    return `${simbol}${Number.isInteger(nilai) ? nilai : nilai.toFixed(2)}`;
  };

  // Toast memakai region dan kelas milik tema, bukan kotak mengambang buatan
  // sendiri, supaya posisi dan animasinya sama dengan notifikasi lain.
  const toastRegion = el('div', 'ui-toast-region');
  toastRegion.dataset.padevToastRegion = 'true';
  toastRegion.setAttribute('aria-live', 'polite');
  document.body.append(toastRegion);

  const toast = (pesan, jenis = 'success') => {
    if (window.PADevToast) return window.PADevToast(pesan, jenis === 'danger' ? 'error' : jenis);
    const kotak = el('article', `ui-toast ui-feedback--${jenis}`);
    kotak.setAttribute('role', jenis === 'danger' ? 'alert' : 'status');
    const isi = el('div');
    isi.append(el('strong', null, jenis === 'danger' ? 'Gagal' : 'Berhasil'), el('p', null, pesan));
    kotak.append(isi);
    toastRegion.append(kotak);
    window.setTimeout(() => kotak.remove(), 3600);
  };

  /* =============================== Tabel ===============================
   *
   * Toolbar, pencarian, saringan, pemilih kolom, kerapatan, mode kartu, pita
   * ringkasan, dan pagination datang dari `padev-table-build.js` +
   * `padev-tables.js` — mesin yang sama persis dengan daftar User Management.
   * Halaman ini hanya menyatakan MAKSUD: kolom apa, baris apa, saringan apa.
   *
   * Sebelumnya halaman modul menggambar toolbar dan tabelnya sendiri. Dua
   * sistem tabel untuk satu maksud selalu jadi dua tampilan yang beda sedikit,
   * dan bedanya bertambah tiap halaman baru.
   *
   * Konsekuensi yang disengaja: pencarian dan saringan status kini dikerjakan
   * mesin di sisi klien atas seluruh baris, bukan query ke API tiap ketikan —
   * sama seperti daftar User Management.
   */

  const { tabel, tautanAksi, aksi: itemAksi } = window.PADevTableBuild;

  const panelTabel = main.querySelector('[data-padev-panel]');
  const barAksi = main.querySelector('[data-padev-actions]');

  if (!def.hanyaBaca) {
    const tombol = el('button', 'ui-button ui-button--primary ui-button--sm', `Tambah ${def.judul}`);
    tombol.type = 'button';
    tombol.addEventListener('click', () => bukaForm(null));
    barAksi.append(tombol);
  }

  const selGambar = (baris, kolom) => {
    const wrap = el('span', 'padev-thumb-cell');
    // Kolomnya disebut definisi modul: testimoni memakai `avatar`, modul
    // bervisual tema memakai `image_light`.
    const sumber = baris[kolom.name];
    if (!sumber && kolom.inisialDari) {
      wrap.classList.add('is-inisial');
      wrap.textContent = String(baris[kolom.inisialDari] || '?').trim().split(/\s+/).slice(0, 2)
        .map((bagian) => bagian.charAt(0).toUpperCase()).join('');
      return wrap;
    }
    if (sumber) {
      const img = document.createElement('img');
      img.src = sumber;
      img.alt = '';
      img.loading = 'lazy';
      wrap.append(img);
    }
    return wrap;
  };

  const selJudul = (baris, kolom) => {
    const wrap = el('span', 'ui-avatar-cell');
    const teks = el('span');
    teks.append(el('strong', null, baris[kolom.name] || '—'));
    if (kolom.sub && baris[kolom.sub]) teks.append(el('small', null, baris[kolom.sub]));
    wrap.append(teks);
    return wrap;
  };

  /**
   * Satu sel menurut definisi kolomnya.
   *
   * Nilai yang DITAMPILKAN dan nilai yang DIURUTKAN sengaja dipisah untuk
   * tanggal dan harga: "10 Agu 2026" dan "$12" tidak pernah terurut benar
   * secara teks, jadi keduanya membawa `urut` berupa nilai mentahnya.
   */
  const selKolom = (baris, kolom) => {
    const nilai = baris[kolom.name];
    switch (kolom.render) {
      case 'thumbnail': return selGambar(baris, kolom);
      case 'judul': return selJudul(baris, kolom);
      case 'status': {
        const badge = el('span', nadaStatus(nilai), labelStatus(nilai));
        return { isi: badge, urut: labelStatus(nilai) };
      }
      case 'tanggal': return { isi: tanggal(nilai), urut: nilai ? new Date(nilai).getTime() : 0 };
      case 'rating': {
        const bintang = Math.max(0, Math.min(5, Number(nilai) || 0));
        return { isi: `${'\u2605'.repeat(bintang)}${'\u2606'.repeat(5 - bintang)}`, urut: bintang };
      }
      case 'harga': return { isi: formatHarga(nilai, baris.currency), urut: Number(nilai || 0) };
      // Harga berupa teks menang atas angkanya — "Custom" bukan nilai yang
      // bisa dinyatakan sebagai bilangan.
      case 'hargaPaket': {
        const teks = baris.price_label || formatHarga(nilai, baris.currency);
        return { isi: `${teks}${baris.price_suffix ? ` ${baris.price_suffix}` : ''}`, urut: Number(nilai || 0) };
      }
      case 'unggulan': return Number(nilai) === 1
        ? { isi: el('span', 'ui-table-status is-success', 'Most Popular'), urut: 1 }
        : { isi: '—', urut: 0 };
      case 'potong': {
        const teks = String(nilai || '');
        return { isi: teks.length > 70 ? `${teks.slice(0, 70)}…` : teks, urut: teks };
      }
      default: return nilai || '—';
    }
  };

  const aksiBaris = (baris) => {
    const daftar = [];
    if (def.hanyaBaca) {
      daftar.push(itemAksi('Tinjau', { bentuk: 'eye', onClick: () => bukaForm(baris) }));
      return daftar;
    }
    if (!def.tanpaUbah) daftar.push(itemAksi('Ubah', { bentuk: 'edit', onClick: () => bukaForm(baris) }));
    daftar.push(itemAksi('Hapus', { bentuk: 'trash', nada: 'danger', onClick: () => hapusBaris(baris) }));
    return daftar;
  };

  const gambarTabel = (data) => {
    panelTabel.replaceChildren(tabel({
      idPrefix: modul,
      countLabel: 'data',
      cari: `Cari ${def.judul.toLowerCase()}…`,
      kolom: def.kolom.map((k) => ({ label: k.label, urut: k.render !== 'thumbnail' })),
      filter: [{
        key: 'status',
        label: 'Semua status',
        options: def.status.map((s) => ({ value: s.value, label: s.label })),
      }],
      baris: data.map((baris) => ({
        kunci: { status: baris.status ?? '' },
        cari: def.kolom.map((k) => baris[k.name] ?? '').join(' '),
        sel: def.kolom.map((k) => selKolom(baris, k)),
        aksi: aksiBaris(baris),
        aksiLabel: `Aksi untuk ${baris.title || baris.name || 'baris ini'}`,
      })),
    }));
  };

  const muat = async () => {
    try {
      const hasil = await minta(api);
      gambarTabel(hasil.data);
    } catch (error) {
      toast(error.message, 'danger');
    }
  };

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
    panel.querySelectorAll('textarea[data-padev-rich-editor]').forEach((textarea) => {
      window.tinymce?.get(textarea.id)?.remove();
    });
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

    const setUploadStatus = (message, loading = false) => {
      status.replaceChildren();
      if (loading) {
        const spinner = el('span', 'ui-form-spinner');
        spinner.setAttribute('aria-hidden', 'true');
        status.append(spinner);
      }
      status.append(String(message));
    };

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
      setUploadStatus('Mengunggah…', true);

      const data = new FormData();
      data.append('file', berkas);
      data.append('variant', field.name.includes('dark') ? 'dark' : 'light');

      try {
        const hasil = await minta('/api/admin/uploads', { method: 'POST', body: data });
        tersembunyi.value = hasil.url;
        tampilkan(hasil.url);
        setUploadStatus(`Terunggah — ${(hasil.size / 1024).toFixed(0)} KB`);
      } catch (error) {
        setUploadStatus('PNG, JPG, WebP, atau AVIF — maksimal 4 MB.');
        galat.textContent = error.message;
        galat.classList.remove('hidden');
        toast(error.message, 'danger');
        input.value = '';
      }
    });

    kanan.append(input, status, galat);
    kotak.append(pratinjau, kanan);
    wrap.append(kotak, tersembunyi);
    wrap.dataset.padevField = field.name;
    return wrap;
  };

  const kotakBiasa = (field, nilaiAwal, menyunting = false) => {
    const wrap = el('label');
    wrap.dataset.padevField = field.name;
    wrap.append(el('span', null, field.label));

    let kontrol;
    if (field.type === 'textarea') {
      kontrol = document.createElement('textarea');
      kontrol.rows = field.rows || 3;
      if (field.rich) {
        kontrol.dataset.padevRichEditor = 'true';
        kontrol.id = `padev-rich-${modul}-${field.name}`;
      }
      
    } else if (field.type === 'select') {
      kontrol = document.createElement('select');
      
      field.options.forEach((o) => kontrol.append(new Option(o.label, o.value)));
    } else {
      kontrol = document.createElement('input');
      kontrol.type = field.type === 'number' ? 'number' : (field.type === 'url' ? 'url' : 'text');
      if (field.step) kontrol.step = field.step;
      if (field.min !== undefined) kontrol.min = String(field.min);
      
      if (field.placeholder) kontrol.placeholder = field.placeholder;
    }

    kontrol.name = field.name;
    if (nilaiAwal !== undefined && nilaiAwal !== null && nilaiAwal !== '') kontrol.value = nilaiAwal;
    else if (field.type !== 'select') kontrol.value = '';
    if (field.readOnly || (field.readOnlyOnEdit && menyunting)) {
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
      badan.append(field.type === 'image' ? kotakGambar(field, awal) : kotakBiasa(field, awal, Boolean(baris)));
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

      // TinyMCE menyimpan isi editor kembali ke <textarea> sebelum FormData
      // dibaca. Jika asset editor gagal dimuat, textarea biasa tetap bekerja.
      window.tinymce?.triggerSave();
      const data = Object.fromEntries(new FormData(form).entries());

      const semula = simpan.textContent;
      const memakaiFeedback = Boolean(window.PADevButton?.busy(simpan, 'Menyimpan…'));
      if (!memakaiFeedback) {
        simpan.disabled = true;
        simpan.textContent = 'Menyimpan…';
      }

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
        // Pesan galat ditempel di kolomnya masing-masing, bukan ditumpuk di atas.
        Object.entries(error.errors || {}).forEach(([nama, pesan]) => {
          const slot = form.querySelector(`[data-padev-field="${nama}"] p`);
          if (slot) {
            slot.textContent = pesan;
            slot.classList.remove('hidden');
          }
        });
        toast(error.message, 'danger');
      } finally {
        if (memakaiFeedback) window.PADevButton.idle(simpan);
        else {
          simpan.disabled = false;
          simpan.textContent = semula;
        }
      }
    });

    panel.append(kepala, form);
    overlay.hidden = false;
    form.querySelectorAll('textarea[data-padev-rich-editor]').forEach((textarea) => {
      if (!window.tinymce) return;
      window.tinymce.init({
        target: textarea,
        base_url: '/adminpanel/assets/vendor/tinymce',
        suffix: '.min',
        license_key: 'gpl',
        menubar: false,
        plugins: 'lists link',
        toolbar: 'undo redo | blocks | bold italic | bullist numlist | link | removeformat',
        toolbar_mode: 'wrap',
        statusbar: false,
        branding: false,
        promotion: false,
        min_height: 280,
        resize: true,
        content_style: 'body { font-family: Outfit, Arial, sans-serif; font-size: 14px; line-height: 1.65; color: #172033; }',
      }).catch(() => toast('Editor kaya tidak dapat dimuat; gunakan area teks biasa.', 'danger'));
    });
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
