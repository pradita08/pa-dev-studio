# _api_padev — API autentikasi PA DEV STUDIO

Express + JWT + MySQL. Satu proses ini mengerjakan dua hal: melayani API
autentikasi, dan menyajikan halaman `/auth` (PA DEV Auth) serta `/adminpanel`
(PA DEV Admin) hasil build dari `_app_padev_auth` dan `_app_padev_admin`.

Halaman dan API disatukan supaya penjagaan halaman admin memakai verifikasi
token yang sama persis dengan API — tidak ada dua definisi "sudah login" yang
bisa berbeda. Homepage publik React tetap di service `pa_dev` dan tidak
disentuh dari sini.

## Endpoint

| Method | Path | Keterangan |
|---|---|---|
| `POST` | `/api/auth/login` | `{ email, password, remember }` → cookie sesi + `accessToken` |
| `POST` | `/api/auth/refresh` | Tukar cookie refresh dengan pasangan token baru |
| `POST` | `/api/auth/logout` | Cabut refresh token, hapus cookie |
| `GET` | `/api/auth/me` | Profil pengguna sesi berjalan |
| `GET` | `/api/health` | Status service |

Halaman: `GET /auth/` (login) dan `GET /adminpanel/*` (dashboard dan seluruh
halaman tema admin, wajib sesi).

## Endpoint konten

Empat modul memakai satu route generik. `:module` hanya boleh bernilai
`articles`, `projects`, `templates`, atau `inquiries` — nama tabel dan kolom
tidak pernah datang dari request, melainkan dari `src/content-modules.js`.

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/api/content/:module` | publik | Hanya berstatus `published`. Untuk landing |
| `POST` | `/api/inquiries` | publik | Kiriman form kontak, dibatasi 5 per 15 menit per IP |
| `GET` | `/api/admin/:module` | sesi | Daftar + pencarian (`q`) + saringan (`status`) |
| `GET` | `/api/admin/:module/:id` | sesi | Satu baris |
| `POST` | `/api/admin/:module` | sesi | Buat baru (kecuali `inquiries`) |
| `PATCH` | `/api/admin/:module/:id` | sesi | Ubah sebagian |
| `DELETE` | `/api/admin/:module/:id` | sesi | Hapus baris beserta gambarnya |
| `POST` | `/api/admin/uploads` | sesi | Unggah satu gambar, balasannya berisi URL |

`inquiries` sengaja tidak bisa dibuat dari admin (`405`) dan isi pesannya tidak
bisa disunting — hanya `status` dan `note` yang boleh berubah. Pesan itu bukti
dari pengunjung, bukan catatan internal.

## Aturan pasangan gambar

Landing memakai komponen `ThemeImage` yang merender berkas terang **dan** gelap
lalu menyembunyikan salah satunya lewat CSS. Satu gambar saja berarti kartu
kosong di salah satu mode, dan itu baru ketahuan setelah tayang.

Karena itu `image_light` dan `image_dark` **wajib berpasangan saat status
`published`**, dan aturannya ditegakkan di server — bukan hanya di form admin.
Saat masih `draft`, salah satu boleh kosong supaya penulisan bisa dicicil.

Gambar hanya diterima dalam bentuk URL hasil `POST /api/admin/uploads`; nilai
yang tidak diawali `/uploads/` ditolak. SVG tidak diterima karena bisa memuat
skrip dan disajikan dari origin yang sama dengan panel admin.

Berkas tersimpan di volume `padev_uploads`, bukan di dalam image — kalau ikut
image, seluruh unggahan akan hilang setiap kali container dibangun ulang.

## Model token

| Token | Umur | Tempat | Dicabut lewat |
|---|---|---|---|
| Access | 15 menit | Cookie httpOnly `padev_session`, atau header `Authorization: Bearer` | kedaluwarsa sendiri |
| Refresh | 7 hari | Cookie httpOnly `padev_refresh` | `padev_auth_refresh_tokens.revoked_at` |

Refresh token **dirotasi**: sekali pakai, dan yang lama langsung dicabut. Token
refresh yang tercuri jadi tidak berguna begitu pemilik sahnya memakai miliknya.

Halaman admin dibuka lewat navigasi browser, yang tidak bisa memasang header
`Authorization` — karena itu sesi dibawa cookie httpOnly. Saat access token
habis tetapi refresh masih berlaku, middleware halaman merotasi sesi diam-diam
sehingga pengguna tidak terlempar ke login di tengah pekerjaan.

## Database

Tabel milik API memakai awalan `padev_`:

- `padev_users` — akun admin (`password_hash` bcrypt cost 12)
- `padev_auth_refresh_tokens` — `jti` sesi refresh, untuk pencabutan

**Skema legacy CodeIgniter 4 + Shield di database `pa_dev` (`users`,
`auth_identities`, `auth_groups_users`, dan seterusnya) tidak dibaca, tidak
diubah, dan tidak dipakai ulang.** Nama `users` tanpa awalan sudah menjadi
milik legacy dengan bentuk kolom yang sama sekali berbeda.

Skema dibuat saat container naik (`CREATE TABLE IF NOT EXISTS`) dan admin awal
di-seed hanya kalau `ADMIN_EMAIL` belum ada di `padev_users`. Mengubah
`ADMIN_PASSWORD` di `.env` setelah akun terbentuk **tidak** mengganti password
akun tersebut.

## Konfigurasi

Seluruh nilai dari environment; lihat `../.env.example`. Yang wajib diperhatikan:

- `JWT_SECRET` — minimal 32 karakter. Proses menolak start di
  `NODE_ENV=production` kalau lebih pendek. Menggantinya membatalkan semua sesi.
- `COOKIE_SECURE` — set `true` hanya setelah situs dilayani lewat HTTPS. Pada
  HTTP, cookie `Secure` tidak pernah dikirim browser dan login akan gagal.

## Test

```bash
npm test        # verifikasi token dan pembatas percobaan login
```

Test tidak membutuhkan database.

## Catatan operasional

Pembatas percobaan login dihitung di memori proses. Cukup untuk satu container;
kalau API diskalakan ke beberapa replika, hitungan itu perlu dipindah ke
penyimpanan bersama.
