/**
 * Definisi halaman setelan: Homepage dan Settings.
 *
 * KENAPA BUKAN MODUL KONTEN BIASA
 * Keduanya tidak punya "daftar baris" — tidak ada yang ditambah atau dihapus,
 * yang ada hanya sekumpulan nilai yang disunting. Karena itu menunya pun hanya
 * membawa aksi `read` dan `update`, dan halamannya berbentuk formulir, bukan
 * tabel.
 *
 * KENAPA DEFINISI ADA DI SINI, BUKAN DI DATABASE
 * Tabel `padev_settings` menyimpan pasangan (group_key, field_key, value)
 * sehingga menambah field tidak menuntut migrasi. Konsekuensinya, tabel itu
 * tidak tahu field apa yang SAH. Daftar di berkas inilah yang tahu: nilai yang
 * tidak ada di sini tidak pernah ditulis dan tidak pernah dibaca, jadi baris
 * liar tidak bisa menyelinap masuk lewat request.
 *
 * NAMA GRUP = NAMA HALAMAN. `homepage` dijaga izin
 * `adminpanel/padev-homepage:*`, sama persis dengan izin yang menjaga
 * halamannya — satu nama untuk satu kewenangan.
 */

/** @typedef {{name: string, label: string, type?: string, help?: string, max?: number, options?: {value: string, label: string}[]}} Field */

export const settingsGroups = {
  homepage: {
    label: 'Homepage',
    sections: [
      {
        title: 'Hero',
        description: 'Bagian paling atas landing — yang terbaca sebelum pengunjung menggulir.',
        fields: [
          { name: 'hero_eyebrow', label: 'Eyebrow', max: 120, help: 'Teks kecil di atas judul.' },
          { name: 'hero_title', label: 'Judul', max: 190 },
          { name: 'hero_highlight', label: 'Kata yang ditonjolkan', max: 80, help: 'Bagian judul yang diberi warna aksen.' },
          { name: 'hero_subtitle', label: 'Subjudul', type: 'textarea', max: 500 },
        ],
      },
      {
        title: 'Tombol ajakan',
        description: 'Dua tombol di bawah subjudul hero.',
        fields: [
          { name: 'cta_primary_label', label: 'Tombol utama', max: 60 },
          { name: 'cta_primary_url', label: 'Tautan tombol utama', type: 'url', max: 255 },
          { name: 'cta_secondary_label', label: 'Tombol kedua', max: 60 },
          { name: 'cta_secondary_url', label: 'Tautan tombol kedua', type: 'url', max: 255 },
        ],
      },
      {
        title: 'Bukti sosial',
        fields: [
          { name: 'trust_note', label: 'Catatan kepercayaan', max: 190, help: 'Contoh: "Dipercaya 25.000+ developer".' },
          { name: 'trust_rating', label: 'Rating yang ditampilkan', max: 20, help: 'Contoh: "4.9/5".' },
        ],
      },
    ],
  },

  settings: {
    label: 'Settings',
    sections: [
      {
        title: 'Identitas situs',
        fields: [
          { name: 'site_name', label: 'Nama situs', max: 120 },
          { name: 'site_tagline', label: 'Tagline', max: 190 },
          { name: 'site_description', label: 'Deskripsi meta', type: 'textarea', max: 300, help: 'Dipakai mesin pencari dan pratinjau tautan.' },
        ],
      },
      {
        title: 'Kontak',
        fields: [
          { name: 'contact_email', label: 'Email', type: 'email', max: 190 },
          { name: 'contact_phone', label: 'Telepon', max: 40 },
          { name: 'contact_address', label: 'Lokasi', max: 190 },
          // Terpisah dari lokasi karena landing memang menampilkan keduanya
          // sebagai dua baris berbeda.
          { name: 'contact_availability', label: 'Jam kerja', max: 190, help: 'Contoh: "Mon – Fri, 09:00 – 18:00 WIB".' },
        ],
      },
      {
        title: 'Media sosial',
        fields: [
          { name: 'social_github', label: 'GitHub', type: 'url', max: 255 },
          { name: 'social_linkedin', label: 'LinkedIn', type: 'url', max: 255 },
          { name: 'social_instagram', label: 'Instagram', type: 'url', max: 255 },
        ],
      },
      {
        title: 'Ketersediaan',
        description: 'Menyalakan mode pemeliharaan tidak memutus panel admin — hanya halaman publik.',
        fields: [
          {
            name: 'maintenance_mode',
            label: 'Mode pemeliharaan',
            type: 'select',
            options: [{ value: 'off', label: 'Nonaktif' }, { value: 'on', label: 'Aktif' }],
          },
          { name: 'maintenance_message', label: 'Pesan pemeliharaan', type: 'textarea', max: 300 },
        ],
      },
    ],
  },
};

/** Semua field sebuah grup, tanpa pembagian seksinya. */
export const fieldsOf = (group) => (settingsGroups[group]?.sections || []).flatMap((s) => s.fields);

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class SettingsValidationError extends Error {
  constructor(errors) {
    super('Data tidak valid');
    this.name = 'SettingsValidationError';
    this.errors = errors;
  }
}

/**
 * Menyaring badan request menjadi pasangan field→nilai yang boleh disimpan.
 *
 * Field yang tidak dikirim TIDAK diubah: halaman boleh menyimpan satu seksi
 * saja tanpa mengosongkan seksi lain yang tidak ikut terkirim.
 */
export const buildSettingsPayload = (group, body) => {
  const errors = {};
  const nilai = {};

  for (const field of fieldsOf(group)) {
    if (!Object.prototype.hasOwnProperty.call(body, field.name)) continue;
    const teks = body[field.name] === null || body[field.name] === undefined ? '' : String(body[field.name]).trim();

    if (teks === '') { nilai[field.name] = ''; continue; }
    if (field.max && teks.length > field.max) { errors[field.name] = `Maksimal ${field.max} karakter.`; continue; }

    if (field.type === 'email' && !EMAIL.test(teks)) {
      errors[field.name] = 'Alamat email tidak valid.';
      continue;
    }
    if (field.type === 'url' && !/^(https?:\/\/|\/|#)/i.test(teks)) {
      // Menerima tautan relatif dan jangkar: tidak semua tujuan berada di luar situs.
      errors[field.name] = 'Tautan harus diawali http://, https://, /, atau #.';
      continue;
    }
    if (field.type === 'select' && !field.options.some((o) => o.value === teks)) {
      errors[field.name] = `Pilih salah satu: ${field.options.map((o) => o.value).join(', ')}.`;
      continue;
    }
    nilai[field.name] = teks;
  }

  if (Object.keys(errors).length > 0) throw new SettingsValidationError(errors);
  return nilai;
};
