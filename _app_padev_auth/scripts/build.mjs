/**
 * Build PA DEV Auth.
 *
 * Sengaja jauh lebih sederhana daripada build backpage: halaman publik tidak
 * memakai select2, jQuery, maupun Chart.js, jadi tidak ada langkah vendor.
 * Isinya hanya: susun CSS, salin aset, salin JS, salin halaman.
 */
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');

await rm(dist, { recursive: true, force: true });
await mkdir(path.join(dist, 'assets', 'css'), { recursive: true });

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

// Jembatan ke API JWT disuntikkan di sini, bukan ditulis di 15 halaman satu per
// satu, supaya halaman tetap sama persis dengan template aslinya.
const bridge = '<script src="./assets/js/padev-auth-api.js" defer></script>';

for (const entry of await readdir(path.join(src, 'pages'))) {
  if (!entry.endsWith('.html')) continue;
  const html = await readFile(path.join(src, 'pages', entry), 'utf8');
  // Halaman ini harus tetap static murni — token server-side apa pun ditolak
  // supaya dist/ bisa disajikan Nginx tanpa runtime tambahan.
  if (/<\?(?:php|=)/i.test(html)) throw new Error(`PHP token ditemukan pada ${entry}`);
  if (!html.includes('</body>')) throw new Error(`Tag </body> tidak ditemukan pada ${entry}`);
  await writeFile(path.join(dist, entry), html.replace('</body>', `${bridge}\n</body>`));
}

console.log('PA DEV Auth built:', dist);
