/**
 * Endpoint konten: CRUD untuk admin, baca-saja untuk landing.
 *
 * Satu route generik melayani keempat modul. Yang membuatnya aman adalah
 * `content-modules.js`: nama tabel dan nama kolom hanya boleh berasal dari
 * definisi di sana, tidak pernah dari request.
 */
import { Router } from 'express';
import {
  countByStatus, deleteRow, findRow, insertRow, listRows, slugTaken, updateRow,
} from '../content-db.js';
import { ValidationError, assertImagePair, buildPayload, modules, slugify } from '../content-modules.js';
import { hapusBerkas, uploadGambar, urlUntuk } from '../uploads.js';
import { requireApiAuth } from '../session.js';
import { AttemptLimiter } from '../rate-limit.js';

export const contentRouter = Router();

const PUBLIK = new Set(['articles', 'projects', 'templates']);

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
    // Inquiry hanya lahir dari pengunjung, tidak pernah dibuat dari admin.
    if (modul.adminEditable) {
      response.status(405).json({ error: 'Method Not Allowed', message: `${modul.label} hanya masuk dari form publik.` });
      return;
    }

    const payload = buildPayload(modul, request.body);
    assertImagePair(modul, payload);
    payload.slug = await slugUnik(modul.table, payload.slug || payload.title);
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
    for (const kolom of ['image_light', 'image_dark']) {
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
    await hapusBerkas(baris.image_light, baris.image_dark);
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});
