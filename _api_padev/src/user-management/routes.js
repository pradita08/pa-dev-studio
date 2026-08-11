/**
 * Endpoint User Management.
 *
 * Ditegakkan dengan izin milik pengguna, bukan role. Setiap endpoint menuntut
 * satu izin yang sama persis dengan yang menjaga halamannya.
 */
import { Router } from 'express';
import {
  ConflictError, ValidationError,
  changeOwnPassword, createGroup, createUser, defaultKeysOfGroup, deleteGroup, deleteUser,
  getGroup, getUser, listGroups, listUsers, permissionCatalog, setOwnAvatar,
  templateKeysOfGroup, updateGroup, updateOwnProfile, updateUser,
} from './service.js';
import {
  createMenu, daftarPathTersedia, deleteMenu, getMenu, listMenus, menuTreeFor, updateMenu,
} from './menu-service.js';
import { requireApiAuth, requirePermission } from '../session.js';
import { hapusBerkas, uploadGambar, urlUntuk } from '../uploads.js';
import { revokeAllRefreshTokensOf } from '../db.js';

export const userManagementRouter = Router();

const tangani = (error, response, next) => {
  if (error instanceof ValidationError) {
    response.status(422).json({ error: 'Unprocessable Entity', message: error.message, errors: error.errors });
    return;
  }
  if (error instanceof ConflictError) {
    response.status(409).json({ error: 'Conflict', message: error.message });
    return;
  }
  next(error);
};

const bungkus = (fn) => async (request, response, next) => {
  try { await fn(request, response); } catch (error) { tangani(error, response, next); }
};

userManagementRouter.use(requireApiAuth);

/* ===================== Milik sesi berjalan ===================== */

// Sidebar. Tidak menuntut izin khusus: isinya sudah disaring menurut izin
// pengguna itu sendiri, dan menu tersembunyi bukan mekanisme otorisasi.
userManagementRouter.get('/me/menus', bungkus(async (request, response) => {
  response.json({ data: await menuTreeFor(request.user.permissions) });
}));

/* Identitas sendiri. Tidak menuntut izin User Management: setiap akun boleh
 * memperbaiki namanya dan emailnya sendiri, dan yang bisa disentuh di sini
 * memang hanya itu — role, status, dan izin tidak ikut. */
userManagementRouter.patch('/me', bungkus(async (request, response) => {
  const user = await updateOwnProfile(request.user.id, {
    name: request.body?.name,
    email: request.body?.email,
  });
  if (!user) { response.status(404).json({ error: 'Not Found', message: 'Akun tidak ditemukan.' }); return; }
  response.json({ data: user, message: 'Identitas diperbarui.' });
}));

/* Foto profil. Memakai penerima berkas yang sama dengan modul konten, jadi
 * batas ukuran, daftar tipe (SVG ditolak), dan penamaan ulang berbasis UUID
 * berlaku tanpa ditulis ulang. */
userManagementRouter.post('/me/avatar', (request, response, next) => {
  uploadGambar.single('file')(request, response, async (error) => {
    if (error) {
      const terlaluBesar = error.code === 'LIMIT_FILE_SIZE';
      response.status(terlaluBesar ? 413 : 422).json({
        error: terlaluBesar ? 'Payload Too Large' : 'Unprocessable Entity',
        message: terlaluBesar ? 'Ukuran foto maksimal 4 MB.' : error.message,
      });
      return;
    }
    if (!request.file) {
      response.status(422).json({ error: 'Unprocessable Entity', message: 'Tidak ada berkas yang dikirim.' });
      return;
    }
    try {
      const hasil = await setOwnAvatar(request.user.id, urlUntuk(request.file.path));
      // Foto lama tidak dirujuk siapa pun lagi setelah baris diperbarui.
      if (hasil?.sebelumnya) await hapusBerkas(hasil.sebelumnya);
      response.status(201).json({ url: hasil?.sekarang, message: 'Foto profil diperbarui.' });
    } catch (galat) {
      next(galat);
    }
  });
});

userManagementRouter.delete('/me/avatar', bungkus(async (request, response) => {
  const hasil = await setOwnAvatar(request.user.id, null);
  if (hasil?.sebelumnya) await hapusBerkas(hasil.sebelumnya);
  response.json({ status: 'ok', message: 'Foto profil dihapus.' });
}));

userManagementRouter.post('/me/password', bungkus(async (request, response) => {
  await changeOwnPassword(request.user.id, {
    current: request.body?.current_password,
    next: request.body?.new_password,
  });
  // Kata sandi berubah berarti seluruh sesi lain milik pengguna ini harus mati.
  await revokeAllRefreshTokensOf(request.user.id);
  response.json({ status: 'ok', message: 'Kata sandi diperbarui. Sesi lain telah diakhiri.' });
}));

/* ========================== Katalog izin ========================== */

userManagementRouter.get('/permissions', requirePermission('adminpanel/padev-users:read'), bungkus(async (_request, response) => {
  response.json({ data: await permissionCatalog() });
}));

/**
 * Template izin sebuah role.
 *
 * PADF-UM-001: kontrol izin hanya boleh muncul setelah role dipilih, dan
 * aktivasi bawaan TIDAK mencakup User Management. Karena itu jawaban ini
 * memisahkan `template` (isi role apa adanya) dari `defaults` (yang dicentang
 * otomatis di formulir). Yang mencentang izin User Management harus manusia,
 * secara sadar.
 */
userManagementRouter.get('/permission-template', requirePermission('adminpanel/padev-users:read'), bungkus(async (request, response) => {
  const groupId = Number(request.query.group_id) || 0;
  // `defaults` dihitung `defaultKeysOfGroup`, sumber yang sama persis dengan
  // yang dipakai `createUser`. Jawaban endpoint ini dan hasil pembuatan lewat
  // API karenanya tidak bisa melenceng satu sama lain.
  const [katalog, template, defaults] = await Promise.all([
    permissionCatalog(), templateKeysOfGroup(groupId), defaultKeysOfGroup(groupId),
  ]);
  response.json({ template, defaults, catalog: katalog });
}));

/* ============================ Pengguna ============================ */

userManagementRouter.get('/users', requirePermission('adminpanel/padev-users:read'), bungkus(async (request, response) => {
  response.json({ data: await listUsers({ search: request.query.q, status: request.query.status }) });
}));

userManagementRouter.get('/users/:id', requirePermission('adminpanel/padev-users:read'), bungkus(async (request, response) => {
  const user = await getUser(request.params.id);
  if (!user) { response.status(404).json({ error: 'Not Found' }); return; }
  response.json({ data: user });
}));

userManagementRouter.post('/users', requirePermission('adminpanel/padev-users:create'), bungkus(async (request, response) => {
  response.status(201).json({ data: await createUser(request.body, request.user.email) });
}));

userManagementRouter.patch('/users/:id', requirePermission('adminpanel/padev-users:update'), bungkus(async (request, response) => {
  const user = await updateUser(request.params.id, request.body, request.user.email);
  if (!user) { response.status(404).json({ error: 'Not Found' }); return; }
  // Akun yang dinonaktifkan tidak boleh melanjutkan sesi yang sedang berjalan.
  if (user.status === 'DISABLED') await revokeAllRefreshTokensOf(user.id);
  response.json({ data: user });
}));

userManagementRouter.delete('/users/:id', requirePermission('adminpanel/padev-users:delete'), bungkus(async (request, response) => {
  if (Number(request.params.id) === request.user.id) {
    response.status(409).json({ error: 'Conflict', message: 'Anda tidak dapat menghapus akun Anda sendiri.' });
    return;
  }
  const ok = await deleteUser(request.params.id);
  response.status(ok ? 200 : 404).json(ok ? { status: 'ok' } : { error: 'Not Found' });
}));

/* ============================== Role ============================== */

userManagementRouter.get('/user-groups', requirePermission('adminpanel/padev-user-groups:read'), bungkus(async (_request, response) => {
  response.json({ data: await listGroups() });
}));

userManagementRouter.get('/user-groups/:id', requirePermission('adminpanel/padev-user-groups:read'), bungkus(async (request, response) => {
  const group = await getGroup(request.params.id);
  if (!group) { response.status(404).json({ error: 'Not Found' }); return; }
  response.json({ data: group });
}));

userManagementRouter.post('/user-groups', requirePermission('adminpanel/padev-user-groups:create'), bungkus(async (request, response) => {
  response.status(201).json({ data: await createGroup(request.body) });
}));

userManagementRouter.patch('/user-groups/:id', requirePermission('adminpanel/padev-user-groups:update'), bungkus(async (request, response) => {
  const group = await updateGroup(request.params.id, request.body);
  if (!group) { response.status(404).json({ error: 'Not Found' }); return; }
  response.json({ data: group });
}));

userManagementRouter.delete('/user-groups/:id', requirePermission('adminpanel/padev-user-groups:delete'), bungkus(async (request, response) => {
  const ok = await deleteGroup(request.params.id);
  response.status(ok ? 200 : 404).json(ok ? { status: 'ok' } : { error: 'Not Found' });
}));

/* ========================== Menu & Izin ========================== */

userManagementRouter.get('/menus', requirePermission('adminpanel/padev-menu-permissions:read'), bungkus(async (_request, response) => {
  response.json({ data: await listMenus() });
}));

/**
 * Pilihan path untuk formulir menu.
 *
 * Dijaga izin yang sama dengan halaman Menu & Izin: isinya adalah peta halaman
 * admin yang ada, dan itu bukan informasi untuk siapa pun yang kebetulan punya
 * sesi.
 */
userManagementRouter.get('/menu-paths', requirePermission('adminpanel/padev-menu-permissions:read'), bungkus(async (_request, response) => {
  response.json({ data: daftarPathTersedia() });
}));

userManagementRouter.get('/menus/:id', requirePermission('adminpanel/padev-menu-permissions:read'), bungkus(async (request, response) => {
  const menu = await getMenu(request.params.id);
  if (!menu) { response.status(404).json({ error: 'Not Found' }); return; }
  response.json({ data: menu });
}));

userManagementRouter.post('/menus', requirePermission('adminpanel/padev-menu-permissions:create'), bungkus(async (request, response) => {
  response.status(201).json({ data: await createMenu(request.body) });
}));

userManagementRouter.patch('/menus/:id', requirePermission('adminpanel/padev-menu-permissions:update'), bungkus(async (request, response) => {
  const menu = await updateMenu(request.params.id, request.body);
  if (!menu) { response.status(404).json({ error: 'Not Found' }); return; }
  response.json({ data: menu });
}));

userManagementRouter.delete('/menus/:id', requirePermission('adminpanel/padev-menu-permissions:delete'), bungkus(async (request, response) => {
  const ok = await deleteMenu(request.params.id);
  response.status(ok ? 200 : 404).json(ok ? { status: 'ok' } : { error: 'Not Found' });
}));
