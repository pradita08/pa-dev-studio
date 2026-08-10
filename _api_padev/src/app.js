/**
 * Aplikasi Express: API autentikasi sekaligus penyaji halaman `/auth` dan
 * `/adminpanel`.
 *
 * Halaman dan API disatukan di satu proses dengan sengaja: penjagaan halaman
 * admin memakai verifikasi token yang sama persis dengan API, sehingga tidak
 * ada dua definisi "sudah login" yang bisa berbeda. Homepage publik React
 * tetap di service terpisah dan tidak disentuh dari sini.
 */
import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { contentRouter } from './routes/content.js';
import { userManagementRouter } from './user-management/routes.js';
import { menuTreeFor } from './user-management/menu-service.js';
import { readAccess, requirePageAuth } from './session.js';

/**
 * Aturan cache untuk halaman auth dan admin.
 *
 * HTML, CSS, dan JS di sini memakai NAMA TETAP (`app.css`, `dashboard.html`),
 * bukan nama ber-hash. Menyimpannya lama di browser berarti perbaikan apa pun
 * baru terlihat setelah cache kedaluwarsa — persis jebakan yang membuat
 * perubahan tampilan seolah tidak tersimpan.
 *
 * Karena itu ketiganya `no-cache`: browser tetap menyimpan salinannya, tetapi
 * wajib bertanya dulu. Dengan ETag aktif, jawabannya hampir selalu `304` tanpa
 * kirim ulang isi — murah, dan selalu terbaru.
 *
 * Gambar dan font tetap disimpan lama karena isinya praktis tidak berubah;
 * kalau ditimpa, versinya dinaikkan lewat query seperti pada aset hero.
 */
const staticOptions = {
  etag: true,
  setHeaders(response, filePath) {
    if (/\.(?:png|jpe?g|webp|avif|svg|woff2?|ico)$/.test(filePath)) {
      response.setHeader('Cache-Control', 'public, max-age=604800, immutable');
      return;
    }
    response.setHeader('Cache-Control', 'no-cache');
  },
};

export const createApp = () => {
  const app = express();

  app.disable('x-powered-by');
  // Di belakang gateway Nginx, IP asli klien ada di X-Forwarded-For. Nilai ini
  // dipakai pembatas percobaan login, jadi harus benar.
  app.set('trust proxy', 1);
  // Tanpa ini `/auth` dan `/auth/` cocok ke route yang sama, sehingga
  // pengalihan "tambahkan garis miring" akan mengalihkan ke dirinya sendiri.
  app.set('strict routing', true);

  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));

  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'SAMEORIGIN');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok', service: 'pa-dev-api' });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/admin', userManagementRouter);
  app.use('/api', contentRouter);

  // Berkas unggahan. Bukan bagian image, melainkan volume — lihat uploads.js.
  app.use('/uploads', express.static(config.paths.uploads, {
    etag: true,
    maxAge: '30d',
    index: false,
    // Berkas dikirim apa adanya sebagai unduhan pasif; tidak pernah dieksekusi
    // browser walaupun isinya ternyata bukan gambar.
    setHeaders(response) {
      response.setHeader('Content-Disposition', 'inline');
      response.setHeader('X-Content-Type-Options', 'nosniff');
    },
  }));
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'pa-dev-api' });
  });
  app.use('/api', (_request, response) => {
    response.status(404).json({ error: 'Not Found' });
  });

  /* ============================ Halaman auth ============================
   * Tanpa garis miring penutup, `./assets/...` di HTML akan menunjuk ke root
   * dan seluruh CSS/JS gagal dimuat — karena itu selalu dialihkan dulu. */
  app.get('/auth', (_request, response) => response.redirect(301, '/auth/'));

  app.get(['/auth/', '/auth/index.html'], (request, response, next) => {
    // Sudah punya sesi hidup? Halaman login tidak perlu ditampilkan lagi.
    if (readAccess(request)) {
      response.redirect(302, '/adminpanel/dashboard.html');
      return;
    }
    next();
  });

  app.use('/auth', express.static(config.paths.authDist, staticOptions));

  /* ========================== Halaman adminpanel ==========================
   * Aset tema (CSS, JS, font, gambar) dilayani sebelum penjaga sesi: isinya
   * bukan data pengguna, dan memverifikasi sesi puluhan kali per halaman
   * hanya menambah beban database tanpa menambah keamanan. */
  app.get('/adminpanel', (_request, response) => response.redirect(301, '/adminpanel/dashboard.html'));
  app.get('/adminpanel/', (_request, response) => response.redirect(302, '/adminpanel/dashboard.html'));

  app.use('/adminpanel/assets', express.static(path.join(config.paths.adminDist, 'assets'), staticOptions));
  app.use('/adminpanel/components', express.static(path.join(config.paths.adminDist, 'components'), staticOptions));

  /**
   * Penjaga halaman berdasarkan registry menu.
   *
   * Halaman yang terdaftar di `mst_menu` hanya boleh dibuka pemegang izin
   * `<key>:read`. Halaman yang tidak terdaftar tetap butuh sesi, tetapi tidak
   * menuntut izin khusus — menu adalah tautan, bukan sumber kebenaran tentang
   * halaman apa saja yang ada.
   *
   * SATU PENGECUALIAN: halaman formulir. `padev-users-form.html` sengaja BUKAN
   * menu — ia tujuan sebuah aksi, bukan navigasi — sehingga tanpa aturan ini ia
   * jatuh ke cabang "tidak terdaftar" dan terbuka bagi siapa pun yang punya
   * sesi. Karena itu izinnya diturunkan dengan membuang akhiran `-form`:
   * formulir selalu dijaga izin yang sama persis dengan daftarnya, tanpa satu
   * pun baris tambahan di `mst_menu` dan tanpa nama izin baru yang perlu
   * dikarang.
   *
   * Ini merapikan halaman, bukan menggantikan otorisasi: setiap endpoint yang
   * dipanggil formulir tetap dijaga `requirePermission` sendiri-sendiri.
   */
  const halamanDaftarDari = (berkas) => berkas.replace(/-form\.html$/, '.html');

  const pageGuard = async (request, response, next) => {
    try {
      const berkas = request.path.replace(/^\//, '');
      if (!berkas.endsWith('.html')) { next(); return; }

      const menus = await menuTreeFor(request.user.permissions);
      const { listMenus } = await import('./user-management/menu-service.js');
      const semua = await listMenus();
      const menu = semua.find((m) => m.path === `/adminpanel/${halamanDaftarDari(berkas)}`);
      if (!menu) { next(); return; }

      // Menu tanpa aksi tidak mencetak izin apa pun — itu halaman layanan-diri
      // seperti profil, yang termasuk identitas dan bukan otorisasi. Aturannya
      // harus sama dengan penyaringan sidebar, kalau tidak menunya tampil tetapi
      // halamannya menolak.
      if ((menu.actions || []).length === 0) { next(); return; }

      if (request.user.permissions.includes(`${menu.key}:read`)) { next(); return; }

      // Dialihkan ke halaman pertama yang memang boleh ia buka, bukan dibalas
      // 403 telanjang: pengguna yang salah klik menu lama tetap mendarat di
      // tempat yang masuk akal.
      const tujuan = menus.find((m) => m.path) || menus.flatMap((m) => m.items || []).find((m) => m.path);
      response.status(403);
      response.redirect(tujuan?.path || '/adminpanel/dashboard.html');
    } catch (error) {
      next(error);
    }
  };

  app.use('/adminpanel', requirePageAuth, pageGuard, express.static(config.paths.adminDist, staticOptions));

  app.get('/', (_request, response) => response.redirect(302, '/auth/'));

  app.use((request, response) => {
    // Hanya navigasi yang pantas menerima halaman error ber-HTML. Request aset
    // (`Accept: */*`) juga "menerima" HTML, dan menjawabnya dengan halaman
    // membuat browser menolaknya karena MIME type tidak cocok.
    const navigation = (request.get('accept') || '').includes('text/html');
    if (navigation) {
      response.status(404).sendFile(path.join(config.paths.authDist, 'error-404.html'), (error) => {
        if (error) response.status(404).json({ error: 'Not Found' });
      });
      return;
    }
    response.status(404).json({ error: 'Not Found' });
  });

  app.use((error, _request, response, _next) => {
    console.error('[api]', error);
    response.status(500).json({ error: 'Internal Server Error' });
  });

  return app;
};
