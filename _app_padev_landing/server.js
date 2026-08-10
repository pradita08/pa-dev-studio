import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);
const directory = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(directory, 'dist');

app.disable('x-powered-by');
app.get('/health', (_request, response) => {
  response.status(200).json({ status: 'ok', service: 'pa-dev-studio' });
});

app.use(['/auth', '/auth/*path', '/adminpanel', '/adminpanel/*path', '/api', '/api/*path'], (_request, response) => {
  response.status(404).json({ error: 'Not Found' });
});

app.use(express.static(dist, {
  etag: true,
  maxAge: '1h',
  setHeaders(response, filePath) {
    if (/\.(?:png|jpg|jpeg|webp|svg|woff2)$/.test(filePath)) {
      response.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    }
  },
}));

app.get('/', (_request, response) => response.sendFile(path.join(dist, 'index.html')));

app.use((_request, response) => {
  response.status(404).json({ error: 'Not Found' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PA DEV STUDIO listening on port ${port}`);
});
