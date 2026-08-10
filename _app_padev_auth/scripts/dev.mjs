import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer, get } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
// Port bawaan SENDIRI. 4173 milik backpage, 4174 milik frontpage; kalau dipakai bersama, server ini
// gagal listen lalu justru mengarahkan ke admin yang sudah jalan di sana.
// Ganti sementara lewat env:  PORT=5000 npm run preview
const port = Number(process.env.PORT || 4175);
const localUrl = `http://127.0.0.1:${port}`;
const mime = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

function isAuthServerRunning() {
  return new Promise((resolve) => {
    const request = get(localUrl, (response) => {
      let body = '';

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        resolve(response.statusCode === 200 && body.includes('PA DEV Auth'));
      });
    });

    request.setTimeout(1000, () => request.destroy());
    request.on('error', () => resolve(false));
  });
}

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const file = path.resolve(root, relative);

  if (file !== root && !file.startsWith(root + path.sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const info = await stat(file);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
});

server.on('error', async (error) => {
  if (error.code !== 'EADDRINUSE') {
    console.error(`PA DEV Auth gagal berjalan: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (await isAuthServerRunning()) {
    console.log('PA DEV Auth sudah berjalan.');
    console.log(`  Local: ${localUrl}`);
    return;
  }

  console.error(`Port ${port} sedang dipakai proses lain (bukan PA DEV Auth).`);
  console.error('  Coba port lain:  PORT=5000 npm run preview');
  console.error(`  Local: ${localUrl}`);
  process.exitCode = 1;
});

server.listen(port, '127.0.0.1', () => {
  console.log('PA DEV Auth siap digunakan.');
  console.log(`  Local: ${localUrl}`);
});
