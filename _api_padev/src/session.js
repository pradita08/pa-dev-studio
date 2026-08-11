/**
 * Siklus hidup sesi: terbitkan, baca, rotasi, akhiri.
 *
 * Halaman admin adalah HTML biasa yang dibuka lewat navigasi browser, jadi
 * sesi dibawa cookie httpOnly — bukan header Authorization yang tidak bisa
 * dipasang pada navigasi. Header Bearer tetap diterima untuk klien API.
 */
import { findActiveRefreshToken, revokeRefreshToken, storeRefreshToken } from './db.js';
import { loadSessionUser } from './user-management/service.js';
import { bearerFrom, signAccessToken, signRefreshToken, verifyToken } from './tokens.js';
import { config } from './config.js';

const baseCookie = {
  httpOnly: true,
  secure: config.cookie.secure,
  sameSite: config.cookie.sameSite,
  path: '/',
};

export const publicUser = (user) => ({
  id: Number(user.id),
  name: user.name,
  email: user.email,
  // Nama masuk dan foto dipakai halaman Profil Saya serta avatar di navbar.
  // Keduanya identitas, bukan otorisasi — tidak ada izin yang bergantung padanya.
  username: user.username ?? null,
  avatarUrl: user.avatarUrl ?? null,
  role: user.role,
  status: user.status,
  permissions: user.permissions || [],
});

export const issueSession = async (request, response, user, { remember = true } = {}) => {
  const accessToken = signAccessToken(user);
  const refresh = signRefreshToken(user);

  await storeRefreshToken({
    jti: refresh.jti,
    userId: user.id,
    expiresAt: refresh.expiresAt,
    userAgent: request.get('user-agent'),
    ip: request.ip,
  });

  response.cookie(config.cookie.access, accessToken, {
    ...baseCookie,
    maxAge: config.jwt.accessTtlSeconds * 1000,
  });

  // Tanpa "ingat saya", cookie refresh dibuat cookie sesi: hilang begitu
  // browser ditutup, sementara catatan di database tetap bisa dicabut.
  response.cookie(config.cookie.refresh, refresh.token, {
    ...baseCookie,
    ...(remember ? { maxAge: config.jwt.refreshTtlSeconds * 1000 } : {}),
  });

  return { accessToken, expiresIn: config.jwt.accessTtlSeconds };
};

export const clearSession = async (request, response) => {
  const payload = verifyToken(request.cookies?.[config.cookie.refresh], 'refresh');
  if (payload?.jti) await revokeRefreshToken(payload.jti).catch(() => null);

  response.clearCookie(config.cookie.access, baseCookie);
  response.clearCookie(config.cookie.refresh, baseCookie);
};

/** Access token saja — tanpa menyentuh database. */
export const readAccess = (request) => verifyToken(
  bearerFrom(request) || request.cookies?.[config.cookie.access],
  'access',
);

/**
 * Tukar refresh token dengan pasangan token baru.
 *
 * Token lama selalu dicabut (rotasi): satu refresh token hanya sekali pakai,
 * sehingga token yang tercuri jadi tidak berguna setelah pemilik sahnya
 * memakai miliknya.
 */
export const rotateSession = async (request, response) => {
  const payload = verifyToken(request.cookies?.[config.cookie.refresh], 'refresh');
  if (!payload?.jti) return null;

  const stored = await findActiveRefreshToken(payload.jti);
  if (!stored) return null;

  await revokeRefreshToken(payload.jti);

  const user = await loadSessionUser(stored.user_id);
  if (!user) return null;

  await issueSession(request, response, user, { remember: true });
  return user;
};

/** Sesi yang masih hidup, kalau perlu dengan rotasi diam-diam. */
export const resolveSession = async (request, response) => {
  const access = readAccess(request);
  if (access) {
    // Izin dibaca ulang dari database, tidak diambil dari token. Ini yang
    // membuat pencabutan izin berlaku pada request berikutnya.
    return loadSessionUser(access.sub);
  }
  return rotateSession(request, response);
};

export const requireApiAuth = async (request, response, next) => {
  try {
    const user = await resolveSession(request, response);
    if (!user) {
      response.status(401).json({ error: 'Unauthorized', message: 'Sesi tidak valid atau sudah berakhir.' });
      return;
    }
    request.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware yang menuntut satu izin tertentu.
 *
 * Izin dibaca dari `request.user.permissions`, yang berasal dari
 * `mst_user_permission` — bukan dari role, bukan dari token, dan bukan dari
 * keadaan menu. Menu yang tersembunyi bukan otorisasi; inilah yang
 * menegakkannya.
 */
export const requirePermission = (permission) => function requirePermissionGuard(request, response, next) {
  if (request.user?.permissions?.includes(permission)) {
    next();
    return;
  }
  response.status(403).json({
    error: 'Forbidden',
    message: permission.endsWith(':read')
      ? 'Anda tidak memiliki izin membaca data ini.'
      : 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
    permission,
  });
};


export const requirePageAuth = async (request, response, next) => {
  try {
    const user = await resolveSession(request, response);
    if (user) {
      request.user = user;
      next();
      return;
    }
    const next_ = encodeURIComponent(request.originalUrl);
    response.redirect(302, `/auth/?next=${next_}`);
  } catch (error) {
    next(error);
  }
};
