import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buatHalaman } from './build-padev-pages.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets', 'css'), { recursive: true });

/* Halaman modul dibuat SEBELUM Tailwind berjalan.
 *
 * Pemindai Tailwind membaca `src/pages/*.html`, dan halaman modul ada di situ
 * — tetapi ia berkas hasil, bukan berkas tulisan tangan. Kalau Tailwind
 * berjalan lebih dulu, yang terpindai adalah halaman versi build SEBELUMNYA:
 * kelas yang baru muncul di halaman baru tidak akan pernah ikut terbit sampai
 * build kedua. Itu jenis kesalahan yang tampak seperti "CSS-nya tidak
 * tersimpan" dan hilang sendiri saat build diulang, jadi urutannya dikunci di
 * sini. */
await buatHalaman();

const executable = process.platform === 'win32' ? 'tailwindcss.cmd' : 'tailwindcss';
const tailwind = path.join(root, 'node_modules', '.bin', executable);
const result = spawnSync(tailwind, [
  '-c', path.join(root, 'tailwind.config.js'),
  '-i', path.join(src, 'css', 'input.css'),
  '-o', path.join(dist, 'assets', 'css', 'app.css'),
  '--minify',
], { cwd: root, stdio: 'inherit' });

if (result.status !== 0) process.exit(result.status ?? 1);

await cp(path.join(src, 'assets'), path.join(dist, 'assets'), { recursive: true });
await cp(path.join(src, 'js'), path.join(dist, 'assets', 'js'), { recursive: true });

// Editor dipublikasikan bersama panel, bukan melalui CDN. Selain membuat
// editor tetap tersedia di lingkungan tanpa koneksi internet, ini mencegah
// konten admin bergantung pada skrip pihak ketiga saat halaman dibuka.
await cp(path.join(root, 'node_modules', 'tinymce'), path.join(dist, 'assets', 'vendor', 'tinymce'), { recursive: true });

// Komponen tabel PA DEV ikut apa adanya, di luar Tailwind. Isinya selektor
// turunan tanpa kandidat utility, jadi ia tidak akan selamat dari pemangkasan
// kalau dimasukkan ke `input.css`. Ditautkan hanya oleh halaman yang memakainya.
await cp(path.join(src, 'css', 'padev-tables.css'), path.join(dist, 'assets', 'css', 'padev-tables.css'));

// Komponen halaman User Management, dengan alasan yang sama persis.
await cp(path.join(src, 'css', 'padev-um.css'), path.join(dist, 'assets', 'css', 'padev-um.css'));

// Sesi nyata (nama pengguna, logout, refresh token) disuntikkan ke seluruh
// halaman admin di sini, bukan ditulis manual di tiap berkas.
const session = '<script src="./assets/js/padev-feedback.js" defer></script>\n<script src="./assets/js/padev-admin-session.js" defer></script>';

for (const entry of await readdir(path.join(src, 'pages'))) {
  if (!entry.endsWith('.html')) continue;
  const html = await readFile(path.join(src, 'pages', entry), 'utf8');
  if (/<\?(?:php|=)/i.test(html)) throw new Error(`PHP token ditemukan pada ${entry}`);
  if (!html.includes('</body>')) throw new Error(`Tag </body> tidak ditemukan pada ${entry}`);
  await writeFile(path.join(dist, entry), html.replace('</body>', `${session}\n</body>`));
}

console.log('PA DEV Admin Theme built:', dist);
