/**
 * Endpoint autentikasi.
 *
 *   POST /api/auth/login    email + password  → cookie sesi + access token
 *   POST /api/auth/refresh  cookie refresh    → pasangan token baru
 *   POST /api/auth/logout   cabut sesi berjalan
 *   GET  /api/auth/me       profil pengguna sesi berjalan
 */
import { Router } from 'express';
import { authenticate, loadSessionUser, touchLogin } from '../user-management/service.js';
import { landingPathFor } from '../user-management/menu-service.js';
import { clearSession, issueSession, publicUser, requireApiAuth, rotateSession } from '../session.js';
import { AttemptLimiter } from '../rate-limit.js';
import { config } from '../config.js';

export const authRouter = Router();

const limiter = new AttemptLimiter(config.login);


const invalidCredentials = (response) => response
  .status(401)
  .json({ error: 'Unauthorized', message: 'Email atau password salah. Silakan coba lagi.' });

authRouter.post('/login', async (request, response, next) => {
  try {
    const email = String(request.body?.email || '').trim().toLowerCase();
    const password = String(request.body?.password || '');
    const remember = request.body?.remember !== false;

    if (!email || !password) {
      response.status(422).json({ error: 'Unprocessable Entity', message: 'Email dan password wajib diisi.' });
      return;
    }

    const key = `${request.ip}|${email}`;
    const limit = limiter.check(key);
    if (limit.blocked) {
      response
        .status(429)
        .set('Retry-After', String(limit.retryAfterSeconds))
        .json({
          error: 'Too Many Requests',
          message: `Terlalu banyak percobaan login. Coba lagi dalam ${Math.ceil(limit.retryAfterSeconds / 60)} menit.`,
        });
      return;
    }

    const hasil = await authenticate(email, password);

    if (hasil?.blocked) {
      limiter.fail(key);
      response.status(403).json({ error: 'Forbidden', message: 'Akun Anda dinonaktifkan. Hubungi administrator.' });
      return;
    }
    if (!hasil) {
      limiter.fail(key);
      invalidCredentials(response);
      return;
    }

    limiter.succeed(key);
    const user = await loadSessionUser(hasil.MstUserId);
    const session = await issueSession(request, response, user, { remember });
    await touchLogin(user.id);

    response.json({
      user: publicUser(user),
      accessToken: session.accessToken,
      expiresIn: session.expiresIn,
      // Bukan dashboard tetap: sebagian pengguna tidak berhak membukanya.
      redirectTo: (await landingPathFor(user.permissions)) || '/auth/',
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/refresh', async (request, response, next) => {
  try {
    const user = await rotateSession(request, response);
    if (!user) {
      await clearSession(request, response);
      response.status(401).json({ error: 'Unauthorized', message: 'Sesi sudah berakhir. Silakan masuk lagi.' });
      return;
    }
    response.json({ user: publicUser(user), expiresIn: config.jwt.accessTtlSeconds });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', async (request, response, next) => {
  try {
    await clearSession(request, response);
    response.json({ status: 'ok' });
  } catch (error) {
    next(error);
  }
});

authRouter.get('/me', requireApiAuth, (request, response) => {
  response.json({ user: publicUser(request.user) });
});
