/**
 * Definisi keempat modul konten.
 *
 * Satu berkas ini menjadi sumber kebenaran untuk nama tabel, daftar kolom yang
 * boleh ditulis, dan aturan validasinya. Route CRUD bersifat generik dan
 * membaca definisi di sini — jadi nama tabel maupun nama kolom tidak pernah
 * berasal dari request.
 */

const ENUM_STATUS = ['draft', 'published'];

export const modules = {
  articles: {
    table: 'padev_articles',
    label: 'Artikel',
    searchColumns: ['title', 'category', 'slug'],
    imagePair: true,
    fields: [
      { name: 'title', type: 'string', required: true, max: 190 },
      { name: 'slug', type: 'slug', from: 'title', max: 190 },
      { name: 'category', type: 'string', required: true, max: 80 },
      { name: 'excerpt', type: 'string', max: 500 },
      { name: 'body', type: 'text' },
      { name: 'image_light', type: 'image' },
      { name: 'image_dark', type: 'image' },
      { name: 'status', type: 'enum', values: ENUM_STATUS, default: 'draft' },
      { name: 'published_at', type: 'datetime' },
      { name: 'position', type: 'int', default: 0 },
    ],
  },

  projects: {
    table: 'padev_projects',
    label: 'Portfolio',
    searchColumns: ['title', 'tag', 'slug'],
    imagePair: true,
    fields: [
      { name: 'title', type: 'string', required: true, max: 190 },
      { name: 'slug', type: 'slug', from: 'title', max: 190 },
      { name: 'tag', type: 'string', required: true, max: 80 },
      { name: 'summary', type: 'string', max: 500 },
      // Disimpan sebagai teks dipisah koma, bukan JSON: landing hanya
      // menampilkannya sebagai deretan label, tidak pernah query per item.
      { name: 'stack', type: 'string', max: 255 },
      { name: 'url', type: 'string', max: 255 },
      { name: 'image_light', type: 'image' },
      { name: 'image_dark', type: 'image' },
      { name: 'status', type: 'enum', values: ENUM_STATUS, default: 'draft' },
      { name: 'position', type: 'int', default: 0 },
    ],
  },

  templates: {
    table: 'padev_templates',
    label: 'Template',
    searchColumns: ['title', 'type', 'slug'],
    imagePair: true,
    fields: [
      { name: 'title', type: 'string', required: true, max: 190 },
      { name: 'slug', type: 'slug', from: 'title', max: 190 },
      { name: 'type', type: 'string', required: true, max: 80 },
      { name: 'stack', type: 'string', max: 255 },
      { name: 'price_amount', type: 'int', default: 0, min: 0 },
      { name: 'currency', type: 'enum', values: ['USD', 'IDR', 'EUR'], default: 'USD' },
      { name: 'url', type: 'string', max: 255 },
      { name: 'image_light', type: 'image' },
      { name: 'image_dark', type: 'image' },
      { name: 'status', type: 'enum', values: ENUM_STATUS, default: 'draft' },
      { name: 'position', type: 'int', default: 0 },
    ],
  },

  inquiries: {
    table: 'padev_inquiries',
    label: 'Inquiry',
    searchColumns: ['name', 'email', 'service'],
    orderBy: 'id DESC',
    imagePair: false,
    // Isi pesan datang dari pengunjung dan tidak boleh diubah admin — yang
    // boleh disunting hanya status dan catatan internal.
    adminEditable: ['status', 'note'],
    // Pesan hanya lahir dari form kontak publik; panel tidak pernah mengarang
    // pesan atas nama orang lain.
    adminCreate: false,
    fields: [
      { name: 'name', type: 'string', required: true, max: 120 },
      { name: 'email', type: 'email', required: true, max: 190 },
      { name: 'service', type: 'string', max: 120 },
      { name: 'message', type: 'text', required: true, max: 5000 },
      { name: 'status', type: 'enum', values: ['new', 'read', 'replied', 'archived'], default: 'new' },
      { name: 'note', type: 'string', max: 500 },
    ],
  },

  testimonials: {
    table: 'padev_testimonials',
    label: 'Testimoni',
    searchColumns: ['author_name', 'company', 'quote'],
    imagePair: false,
    fields: [
      { name: 'author_name', type: 'string', required: true, max: 120 },
      { name: 'author_role', type: 'string', max: 120 },
      { name: 'company', type: 'string', max: 120 },
      { name: 'quote', type: 'string', required: true, max: 800 },
      { name: 'rating', type: 'int', default: 5, min: 1, max: 5 },
      // Foto orang, bukan visual bertema: satu berkas, tanpa pasangan gelap.
      { name: 'avatar', type: 'image' },
      { name: 'status', type: 'enum', values: ENUM_STATUS, default: 'draft' },
      { name: 'position', type: 'int', default: 0 },
    ],
  },

  companies: {
    table: 'padev_companies',
    label: 'Company',
    searchColumns: ['name', 'url'],
    imagePair: false,
    fields: [
      { name: 'name', type: 'string', required: true, max: 190 },
      { name: 'url', type: 'url', required: true, max: 255 },
      { name: 'status', type: 'enum', values: ENUM_STATUS, default: 'draft' },
      { name: 'position', type: 'int', default: 0 },
    ],
  },

  faq: {
    table: 'padev_faq',
    label: 'FAQ',
    searchColumns: ['question', 'answer', 'category'],
    imagePair: false,
    fields: [
      { name: 'question', type: 'string', required: true, max: 255 },
      { name: 'answer', type: 'text', required: true, max: 5000 },
      { name: 'category', type: 'string', max: 80 },
      { name: 'status', type: 'enum', values: ENUM_STATUS, default: 'draft' },
      { name: 'position', type: 'int', default: 0 },
    ],
  },

  /* Modul ini memegang PAKET HARGA di landing (Starter / Professional /
   * Enterprise), bukan delapan kartu kemampuan berikon di seksi "End-to-End
   * Digital Solutions".
   *
   * Pembedaannya penting karena bentuk datanya berbeda: paket punya harga,
   * daftar isi paket, dan tombol ajakan; kartu kemampuan hanya judul dan satu
   * kalimat yang menempel pada sebuah ikon. Kolom di bawah — deliverables,
   * price, cta — memang milik paket. */
  services: {
    table: 'padev_services',
    label: 'Paket layanan',
    searchColumns: ['title', 'tagline', 'slug'],
    imagePair: false,
    fields: [
      { name: 'title', type: 'string', required: true, max: 190 },
      { name: 'slug', type: 'slug', from: 'title', max: 190 },
      { name: 'tagline', type: 'string', max: 255 },
      { name: 'description', type: 'text', max: 5000 },
      // Isi paket: teks dipisah koma, sama seperti `stack` pada portfolio.
      // Landing menderetkannya sebagai daftar bercentang.
      { name: 'deliverables', type: 'string', max: 500 },
      // Nilai penuh mata uangnya, bukan sen — lihat catatan migrasi di
      // `content-db.js`.
      { name: 'price_amount', type: 'int', default: 0, min: 0 },
      { name: 'currency', type: 'enum', values: ['USD', 'IDR', 'EUR'], default: 'USD' },
      /* Dipakai saat harganya bukan angka. Kalau terisi, ia MENGGANTIKAN
       * tampilan `price_amount` — "Custom" tidak bisa dinyatakan sebagai
       * bilangan, dan memaksakannya menghasilkan "$0". */
      { name: 'price_label', type: 'string', max: 40 },
      { name: 'price_suffix', type: 'string', max: 40 },
      { name: 'cta_label', type: 'string', max: 60 },
      { name: 'cta_url', type: 'string', max: 255 },
      { name: 'is_featured', type: 'int', default: 0, min: 0, max: 1 },
      { name: 'status', type: 'enum', values: ENUM_STATUS, default: 'draft' },
      { name: 'position', type: 'int', default: 0 },
    ],
  },

  subscribers: {
    table: 'padev_subscribers',
    label: 'Subscriber',
    searchColumns: ['email', 'name', 'source'],
    orderBy: 'id DESC',
    imagePair: false,
    // Alamat langganan datang dari pemiliknya sendiri. Admin boleh mencatat
    // dan mencabut, tetapi mengubah alamat orang lain bukan kewenangan panel —
    // itu akan mengirim surat ke tujuan yang tidak pernah mendaftar.
    adminEditable: ['status', 'note'],
    fields: [
      { name: 'email', type: 'email', required: true, max: 190 },
      { name: 'name', type: 'string', max: 120 },
      { name: 'source', type: 'string', max: 80 },
      { name: 'status', type: 'enum', values: ['active', 'unsubscribed'], default: 'active' },
      { name: 'note', type: 'string', max: 500 },
    ],
  },
};

export const slugify = (value) => String(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9\s-]/g, '')
  .trim()
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .slice(0, 190) || `item-${Date.now()}`;

export class ValidationError extends Error {
  constructor(errors) {
    super('Data tidak valid');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HTTP_URL = /^https?:\/\/[^\s]+$/i;

/**
 * Menyusun payload yang aman untuk ditulis ke database.
 *
 * @param {object} modul definisi dari `modules`
 * @param {object} body  isi request
 * @param {{partial?: boolean, allow?: string[]}} opsi
 */
export const buildPayload = (modul, body, { partial = false, allow = null } = {}) => {
  const errors = {};
  const payload = {};
  const daftar = allow ? modul.fields.filter((f) => allow.includes(f.name)) : modul.fields;

  for (const field of daftar) {
    const hadir = Object.prototype.hasOwnProperty.call(body, field.name);
    // Pada update sebagian, kolom yang tidak dikirim dibiarkan apa adanya.
    if (!hadir && partial) continue;

    let nilai = hadir ? body[field.name] : undefined;

    if (field.type === 'slug') {
      const sumber = nilai || body[field.from];
      if (sumber) payload[field.name] = slugify(sumber);
      continue;
    }

    if (nilai === undefined || nilai === null || nilai === '') {
      if (field.required && !partial) {
        errors[field.name] = 'Wajib diisi.';
        continue;
      }
      if (field.default !== undefined && !partial) payload[field.name] = field.default;
      else if (hadir) payload[field.name] = field.type === 'int' ? (field.default ?? 0) : null;
      continue;
    }

    switch (field.type) {
      case 'int': {
        const angka = Number.parseInt(nilai, 10);
        if (!Number.isFinite(angka)) errors[field.name] = 'Harus berupa angka.';
        else if (field.min !== undefined && angka < field.min) errors[field.name] = `Minimal ${field.min}.`;
        // Batas atas ikut ditegakkan: rating bintang 1–5 kehilangan artinya
        // begitu ada baris bernilai 9 yang lolos masuk.
        else if (field.max !== undefined && angka > field.max) errors[field.name] = `Maksimal ${field.max}.`;
        else payload[field.name] = angka;
        break;
      }
      case 'enum': {
        if (!field.values.includes(String(nilai))) errors[field.name] = `Pilih salah satu: ${field.values.join(', ')}.`;
        else payload[field.name] = String(nilai);
        break;
      }
      case 'email': {
        const teks = String(nilai).trim().toLowerCase();
        if (!EMAIL.test(teks)) errors[field.name] = 'Alamat email tidak valid.';
        else payload[field.name] = teks.slice(0, field.max);
        break;
      }
      case 'url': {
        const teks = String(nilai).trim();
        if (!HTTP_URL.test(teks)) {
          errors[field.name] = 'URL harus diawali http:// atau https://.';
        } else {
          try {
            const url = new URL(teks);
            if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) {
              errors[field.name] = 'URL situs tidak valid.';
            } else {
              payload[field.name] = teks.slice(0, field.max);
            }
          } catch {
            errors[field.name] = 'URL situs tidak valid.';
          }
        }
        break;
      }
      case 'datetime': {
        const tanggal = new Date(nilai);
        if (Number.isNaN(tanggal.getTime())) errors[field.name] = 'Tanggal tidak valid.';
        else payload[field.name] = tanggal.toISOString().slice(0, 19).replace('T', ' ');
        break;
      }
      case 'image': {
        const teks = String(nilai).trim();
        // Hanya menerima berkas yang memang diunggah lewat endpoint upload.
        if (teks && !teks.startsWith('/uploads/')) errors[field.name] = 'Gambar harus hasil unggahan.';
        else payload[field.name] = teks.slice(0, 255) || null;
        break;
      }
      default: {
        const teks = String(nilai).trim();
        if (field.max && teks.length > field.max) errors[field.name] = `Maksimal ${field.max} karakter.`;
        else payload[field.name] = teks;
      }
    }
  }

  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
  return payload;
};

/**
 * Aturan pasangan gambar.
 *
 * Landing memakai `ThemeImage` yang merender berkas terang DAN gelap lalu
 * menyembunyikan salah satu lewat CSS. Kalau hanya satu yang diisi, kartu akan
 * kosong di salah satu mode — dan itu baru ketahuan setelah tayang. Jadi
 * pasangannya diwajibkan pada saat publikasi, bukan saat draft.
 */
export const assertImagePair = (modul, gabungan) => {
  if (!modul.imagePair) return;
  if (gabungan.status !== 'published') return;

  const errors = {};
  if (!gabungan.image_light) errors.image_light = 'Wajib diisi sebelum dipublikasikan.';
  if (!gabungan.image_dark) errors.image_dark = 'Wajib diisi sebelum dipublikasikan.';
  if (Object.keys(errors).length > 0) throw new ValidationError(errors);
};
