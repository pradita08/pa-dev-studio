/**
 * Penerimaan berkas gambar untuk konten admin.
 *
 * Berkas disimpan di volume Docker, bukan di dalam image: kalau ikut image,
 * semua unggahan hilang setiap kali container dibangun ulang.
 *
 * Nama berkas selalu dibuat ulang dari UUID. Nama asli dari pengguna tidak
 * pernah dipakai — nama itu bisa berisi `../`, karakter yang menipu, atau
 * ekstensi ganda seperti `gambar.png.html`.
 */
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import multer from 'multer';
import { config } from './config.js';

// SVG sengaja TIDAK diterima. Berkas SVG bisa memuat <script>, dan karena
// disajikan dari origin yang sama dengan panel admin, itu berarti XSS.
const TIPE_DIIZINKAN = new Map([
  ['image/png', '.png'],
  ['image/jpeg', '.jpg'],
  ['image/webp', '.webp'],
  ['image/avif', '.avif'],
]);

export const UPLOAD_ROOT = config.paths.uploads;

const storage = multer.diskStorage({
  async destination(_request, _file, done) {
    const now = new Date();
    const folder = path.join(
      UPLOAD_ROOT,
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
    );
    try {
      await fs.mkdir(folder, { recursive: true });
      done(null, folder);
    } catch (error) {
      done(error);
    }
  },
  filename(_request, file, done) {
    done(null, `${randomUUID()}${TIPE_DIIZINKAN.get(file.mimetype) || '.bin'}`);
  },
});

export const uploadGambar = multer({
  storage,
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
  fileFilter(_request, file, done) {
    if (!TIPE_DIIZINKAN.has(file.mimetype)) {
      done(new Error('Format gambar harus PNG, JPG, WebP, atau AVIF.'));
      return;
    }
    done(null, true);
  },
});

/** Mengubah path berkas di disk menjadi URL publik. */
export const urlUntuk = (absolut) => `/uploads/${path.relative(UPLOAD_ROOT, absolut).split(path.sep).join('/')}`;

/**
 * Menghapus berkas unggahan milik sebuah baris.
 *
 * Dipanggil setelah baris terhapus. Kegagalan sengaja tidak dilempar: berkas
 * yatim jauh lebih ringan akibatnya daripada permintaan hapus yang gagal
 * padahal datanya sudah hilang.
 */
export const hapusBerkas = async (...urls) => {
  for (const url of urls) {
    if (!url || !url.startsWith('/uploads/')) continue;
    const relatif = url.replace('/uploads/', '');
    // Menolak jalur yang mencoba keluar dari folder unggahan.
    const target = path.resolve(UPLOAD_ROOT, relatif);
    if (!target.startsWith(path.resolve(UPLOAD_ROOT) + path.sep)) continue;
    await fs.unlink(target).catch(() => null);
  }
};
