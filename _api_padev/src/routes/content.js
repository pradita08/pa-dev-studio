/**
 * Endpoint konten: CRUD untuk admin, baca-saja untuk landing.
 *
 * Satu route generik melayani keempat modul. Yang membuatnya aman adalah
 * `content-modules.js`: nama tabel dan nama kolom hanya boleh berasal dari
 * definisi di sana, tidak pernah dari request.
 */
import { Router } from 'express';
import {
  countByStatus, deleteRow, findRow, insertRow, listRows, readSettings, slugTaken, updateRow, writeSettings,
} from '../content-db.js';
import { SettingsValidationError, buildSettingsPayload, settingsGroups } from '../settings-modules.js';
import { ValidationError, assertImagePair, buildPayload, modules, slugify } from '../content-modules.js';
import { hapusBerkas, uploadGambar, urlUntuk } from '../uploads.js';
import { requireApiAuth } from '../session.js';
import { AttemptLimiter } from '../rate-limit.js';

export const contentRouter = Router();

/* Modul yang boleh dibaca tanpa sesi karena landing memang menampilkannya.
 * `inquiries` dan `subscribers` TIDAK pernah masuk daftar ini: keduanya berisi
 * alamat email orang yang mengirim pesan atau mendaftar, dan membukanya ke
 * publik berarti membagikan daftar kontak. */
const PUBLIK = new Set(['articles', 'projects', 'templates', 'testimonials', 'faq', 'services', 'companies']);

const ambilModul = (request, response) => {
  const modul = modules[request.params.module];
  if (!modul) {
    response.status(404).json({ error: 'Not Found', message: 'Modul tidak dikenal.' });
    return null;
  }
  return modul;
};

const tanganiError = (error, response, next) => {
  if (error instanceof ValidationError) {
    response.status(422).json({ error: 'Unprocessable Entity', message: error.message, errors: error.errors });
    return;
  }
  next(error);
};

/** Slug harus unik; angka penambah dipakai agar admin tidak dipaksa mengarang. */
const slugUnik = async (table, dasar, kecuali = 0) => {
  let slug = slugify(dasar);
  let n = 2;
  while (await slugTaken(table, slug, kecuali)) {
    slug = `${slugify(dasar)}-${n}`;
    n += 1;
  }
  return slug;
};

/* ============================== Publik ============================== */

// Dipakai landing. Hanya yang berstatus published yang keluar, dan kolom
// internal seperti catatan atau posisi draft tidak ikut.
contentRouter.get('/content/:module', async (request, response, next) => {
  try {
    const nama = request.params.module;
    if (!PUBLIK.has(nama)) {
      response.status(404).json({ error: 'Not Found' });
      return;
    }
    const modul = modules[nama];
    const { rows } = await listRows(modul.table, {
      status: 'published',
      orderBy: modul.orderBy,
      limit: Math.min(Number(request.query.limit) || 24, 100),
    });
    response.set('Cache-Control', 'public, max-age=60');
    response.json({ data: rows });
  } catch (error) {
    next(error);
  }
});

/* Setelan yang boleh dibaca publik.
 *
 * Landing memerlukan teks hero, nama situs, dan kontak — semuanya memang
 * sudah tampil di halaman itu. Yang TIDAK ikut adalah grup lain mana pun yang
 * nanti ditambahkan: daftar ini tertutup, jadi menambah grup setelan baru
 * tidak diam-diam membuatnya terbaca siapa saja.
 *
 * Jalurnya tiga ruas (`/content/settings/:grup`), sedangkan pembaca modul
 * dua ruas (`/content/:modul`), sehingga keduanya tidak pernah berebut. */
const SETELAN_PUBLIK = new Set(['homepage', 'settings']);

contentRouter.get('/content/settings/:group', async (request, response, next) => {
  try {
    const grup = request.params.group;
    if (!SETELAN_PUBLIK.has(grup)) {
      response.status(404).json({ error: 'Not Found' });
      return;
    }
    response.set('Cache-Control', 'public, max-age=60');
    response.json({ data: await readSettings(grup) });
  } catch (error) {
    next(error);
  }
});

/* Pendaftaran newsletter dari pengunjung anonim.
 *
 * Alamat yang sudah terdaftar dijawab BERHASIL, bukan "sudah ada": jawaban
 * yang membedakan keduanya mengubah form ini menjadi alat untuk menguji
 * apakah sebuah alamat ada di dalam daftar. */
const limiterLangganan = new AttemptLimiter({ maxAttempts: 5, windowSeconds: 15 * 60 });

contentRouter.post('/subscribers', async (request, response, next) => {
  try {
    const kunci = `subscribe|${request.ip}`;
    const batas = limiterLangganan.check(kunci);
    if (batas.blocked) {
      response.status(429).set('Retry-After', String(batas.retryAfterSeconds)).json({
        error: 'Too Many Requests',
        message: 'Terlalu banyak percobaan. Coba lagi beberapa saat lagi.',
      });
      return;
    }

    const modul = modules.subscribers;
    const payload = buildPayload(modul, request.body, { allow: ['email', 'name'] });
    payload.status = 'active';
    payload.source = 'landing';

    try {
      await insertRow(modul.table, payload);
    } catch (error) {
      // Email UNIQUE di database; bentrokannya bukan kegagalan bagi pendaftar.
      if (error.code !== 'ER_DUP_ENTRY') throw error;
    }
    limiterLangganan.fail(kunci);
    response.status(201).json({ message: 'Terima kasih. Alamat Anda sudah terdaftar.' });
  } catch (error) {
    tanganiError(error, response, next);
  }
});

// Kiriman form dari pengunjung anonim. Dibatasi supaya tidak jadi saluran spam.
const limiterInquiry = new AttemptLimiter({ maxAttempts: 5, windowSeconds: 15 * 60 });

contentRouter.post('/inquiries', async (request, response, next) => {
  try {
    const kunci = `inquiry|${request.ip}`;
    const batas = limiterInquiry.check(kunci);
    if (batas.blocked) {
      response.status(429).set('Retry-After', String(batas.retryAfterSeconds)).json({
        error: 'Too Many Requests',
        message: 'Terlalu banyak kiriman. Coba lagi beberapa saat lagi.',
      });
      return;
    }

    const modul = modules.inquiries;
    const payload = buildPayload(modul, request.body, { allow: ['name', 'email', 'service', 'message'] });
    payload.status = 'new';
    payload.ip_address = (request.ip || '').slice(0, 45);
    payload.user_agent = (request.get('user-agent') || '').slice(0, 255);

    const id = await insertRow(modul.table, payload);
    limiterInquiry.fail(kunci);
    response.status(201).json({ id, message: 'Terima kasih. Pesan Anda sudah kami terima.' });
  } catch (error) {
    tanganiError(error, response, next);
  }
});

/* =============================== Admin =============================== */

contentRouter.use('/admin', requireApiAuth);

/**
 * Izin untuk endpoint konten.
 *
 * Kunci izin dan nama modul dijaga sejajar: modul `articles` dijaga
 * `adminpanel/articles:<aksi>`, yaitu izin yang sama persis dengan yang
 * menjaga halamannya. Satu nama untuk satu kewenangan, sehingga tidak mungkin
 * halaman terbuka sementara endpointnya tertutup, atau sebaliknya.
 */
const AKSI_METODE = { GET: 'read', POST: 'create', PATCH: 'update', PUT: 'update', DELETE: 'delete' };

function requireContentPermission(request, response, next) {
  // Unggahan tidak punya modul sendiri; ia menempel pada modul yang memakainya
  // dan sudah dijaga oleh izin create/update di endpoint penyimpanannya.
  if (request.params.module === 'uploads') { next(); return; }
  if (!modules[request.params.module]) { next(); return; }

  const aksi = AKSI_METODE[request.method];
  // Nama izin diturunkan dari path halaman modulnya, sama persis dengan izin
  // yang menjaga halaman itu — satu nama untuk satu kewenangan.
  const izin = `adminpanel/padev-${request.params.module}:${aksi}`;
  if (request.user?.permissions?.includes(izin)) { next(); return; }

  response.status(403).json({
    error: 'Forbidden',
    message: aksi === 'read'
      ? 'Anda tidak memiliki izin membaca data ini.'
      : 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
    permission: izin,
  });
}

/* ===================== Setelan halaman (Homepage, Settings) =====================
 *
 * Bukan CRUD: tidak ada baris yang ditambah atau dihapus, hanya nilai yang
 * disunting. Karena itu rutenya terpisah dari `/admin/:module` dan hanya
 * mengenal dua metode.
 *
 * Izinnya diturunkan dengan pola yang sama dengan modul konten — nama grup
 * adalah nama halamannya — sehingga `homepage` dijaga
 * `adminpanel/padev-homepage:read` dan `:update`, persis izin yang menjaga
 * halamannya.
 */
const penjagaSetelan = (aksi) => function requireSettingsPermission(request, response, next) {
  const grup = request.params.group;
  if (!settingsGroups[grup]) {
    response.status(404).json({ error: 'Not Found', message: 'Grup setelan tidak dikenal.' });
    return;
  }
  const izin = `adminpanel/padev-${grup}:${aksi}`;
  if (request.user?.permissions?.includes(izin)) { next(); return; }
  response.status(403).json({
    error: 'Forbidden',
    message: aksi === 'read'
      ? 'Anda tidak memiliki izin membaca setelan ini.'
      : 'Anda tidak memiliki izin mengubah setelan ini.',
    permission: izin,
  });
};

contentRouter.get('/admin/settings/:group', requireApiAuth, penjagaSetelan('read'), async (request, response, next) => {
  try {
    const grup = request.params.group;
    response.json({
      // Definisi ikut dikirim supaya halaman tidak menyimpan salinan kedua
      // dari daftar field — satu sumber, dipakai server dan layar.
      sections: settingsGroups[grup].sections,
      data: await readSettings(grup),
    });
  } catch (error) {
    next(error);
  }
});

contentRouter.put('/admin/settings/:group', requireApiAuth, penjagaSetelan('update'), async (request, response, next) => {
  try {
    const grup = request.params.group;
    const nilai = buildSettingsPayload(grup, request.body || {});
    await writeSettings(grup, nilai);
    response.json({ data: await readSettings(grup), message: 'Setelan disimpan.' });
  } catch (error) {
    if (error instanceof SettingsValidationError) {
      response.status(422).json({ error: 'Unprocessable Entity', message: error.message, errors: error.errors });
      return;
    }
    next(error);
  }
});

contentRouter.use('/admin/:module', requireContentPermission);

contentRouter.post('/admin/uploads', (request, response) => {
  uploadGambar.single('file')(request, response, (error) => {
    if (error) {
      const terlaluBesar = error.code === 'LIMIT_FILE_SIZE';
      response.status(terlaluBesar ? 413 : 422).json({
        error: terlaluBesar ? 'Payload Too Large' : 'Unprocessable Entity',
        message: terlaluBesar ? 'Ukuran gambar maksimal 4 MB.' : error.message,
      });
      return;
    }
    if (!request.file) {
      response.status(422).json({ error: 'Unprocessable Entity', message: 'Tidak ada berkas yang dikirim.' });
      return;
    }
    response.status(201).json({
      url: urlUntuk(request.file.path),
      size: request.file.size,
      variant: request.body?.variant || null,
    });
  });
});

contentRouter.get('/admin/:module', async (request, response, next) => {
  try {
    const modul = ambilModul(request, response);
    if (!modul) return;
    const hasil = await listRows(modul.table, {
      search: request.query.q,
      searchColumns: modul.searchColumns,
      status: request.query.status,
      orderBy: modul.orderBy,
      limit: Math.min(Number(request.query.limit) || 50, 200),
      offset: Number(request.query.offset) || 0,
    });
    response.json({ data: hasil.rows, total: hasil.total, ringkasan: await countByStatus(modul.table) });
  } catch (error) {
    next(error);
  }
});

contentRouter.get('/admin/:module/:id', async (request, response, next) => {
  try {
    const modul = ambilModul(request, response);
    if (!modul) return;
    const baris = await findRow(modul.table, request.params.id);
    if (!baris) {
      response.status(404).json({ error: 'Not Found' });
      return;
    }
    response.json({ data: baris });
  } catch (error) {
    next(error);
  }
});

contentRouter.post('/admin/:module', async (request, response, next) => {
  try {
    const modul = ambilModul(request, response);
    if (!modul) return;
    /* `adminCreate: false` berarti barisnya hanya lahir dari pengunjung —
     * Inquiry, misalnya. Ini SENGAJA dipisahkan dari `adminEditable`: yang
     * terakhir hanya membatasi field mana yang boleh disunting, dan modul
     * seperti Subscriber membatasi suntingan TETAPI tetap boleh ditambah
     * manual dari panel. */
    if (modul.adminCreate === false) {
      response.status(405).json({ error: 'Method Not Allowed', message: `${modul.label} hanya masuk dari form publik.` });
      return;
    }

    const payload = buildPayload(modul, request.body);
    assertImagePair(modul, payload);
    // Hanya modul yang memang punya kolom slug. Tanpa penjaga ini, modul
    // tanpa slug (Testimoni, FAQ) menabrak kolom yang tidak ada.
    if (modul.fields.some((f) => f.type === 'slug')) {
      payload.slug = await slugUnik(modul.table, payload.slug || payload.title);
    }
    if (payload.status === 'published' && !payload.published_at && modul.fields.some((f) => f.name === 'published_at')) {
      payload.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    const id = await insertRow(modul.table, payload);
    response.status(201).json({ data: await findRow(modul.table, id) });
  } catch (error) {
    tanganiError(error, response, next);
  }
});

contentRouter.patch('/admin/:module/:id', async (request, response, next) => {
  try {
    const modul = ambilModul(request, response);
    if (!modul) return;
    const lama = await findRow(modul.table, request.params.id);
    if (!lama) {
      response.status(404).json({ error: 'Not Found' });
      return;
    }

    const payload = buildPayload(modul, request.body, { partial: true, allow: modul.adminEditable });
    // Aturan pasangan gambar diuji terhadap gabungan data lama dan perubahan,
    // bukan hanya perubahan — kalau tidak, publikasi lewat PATCH bisa lolos.
    assertImagePair(modul, { ...lama, ...payload });

    if (payload.slug) payload.slug = await slugUnik(modul.table, payload.slug, lama.id);
    if (payload.status === 'published' && !lama.published_at && !payload.published_at
        && modul.fields.some((f) => f.name === 'published_at')) {
      payload.published_at = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }

    // Gambar yang digantikan langsung dibersihkan supaya volume tidak menumpuk.
    const usang = [];
    for (const kolom of modul.fields.filter((f) => f.type === 'image').map((f) => f.name)) {
      if (payload[kolom] !== undefined && lama[kolom] && payload[kolom] !== lama[kolom]) usang.push(lama[kolom]);
    }

    await updateRow(modul.table, lama.id, payload);
    await hapusBerkas(...usang);
    response.json({ data: await findRow(modul.table, lama.id) });
  } catch (error) {
    tanganiError(error, response, next);
  }
});

contentRouter.delete('/admin/:module/:id', async (request, response, next) => {
  try {
    const modul = ambilModul(request, response);
    if (!modul) return;
    const baris = await findRow(modul.table, request.params.id);
    if (!baris) {
      response.status(404).json({ error: 'Not Found' });
      return;
    }
    await deleteRow(modul.table, baris.id);
    await hapusBerkas(...modul.fields.filter((f) => f.type === 'image').map((f) => baris[f.name]));
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});
