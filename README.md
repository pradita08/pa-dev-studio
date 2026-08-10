# 06 Source Code

## Tujuan Folder

Menyimpan source website publik PA DEV STUDIO dan runtime Docker development.

## Stack Aktif

- React + Vite untuk antarmuka application warehouse.
- Node.js + Express untuk menyajikan production build dan health endpoint.
- Express + JWT + MySQL untuk autentikasi dan halaman admin.
- PA DEV Auth dan PA DEV Admin (HTML + Tailwind) sebagai tampilan login dan
  dashboard, di-vendor dari `10 Products/01 Backend Themes/01 PADEV Admin`.
- Inter lokal berlisensi SIL Open Font License untuk tipografi runtime.
- Docker Compose dengan gateway Nginx pada port `1080`.
- Service MySQL existing pada port `1081`. Skema legacy CodeIgniter 4 + Shield
  di dalamnya tidak dibaca maupun diubah; API memakai tabel berawalan `padev_`.

## Peta Port

| Port | Isi |
|---|---|
| `1080` | Gateway — pintu masuk resmi seluruh situs |
| `1081` | MySQL |
| `1082` | API langsung, untuk debug |
| `1083` | React publik langsung, untuk debug |

Port `1080` sekarang dipegang gateway, bukan `pa_dev`. Homepage tetap terbuka di
alamat yang sama; yang berubah hanya siapa yang menerima request lebih dulu.

## Struktur Aktif

```text
06 Source Code/
├── _app_padev_landing/   # React homepage publik, Node.js, test, public asset
├── _app_padev_auth/      # template PA DEV Auth (source, dibangun di Docker)
├── _app_padev_admin/     # template PA DEV Admin (source, dibangun di Docker)
├── _api_padev/           # Express + JWT + MySQL, penyaji /auth dan /adminpanel
├── _docker/
│   ├── node/Dockerfile   # runtime React publik
│   ├── api/Dockerfile    # runtime API + build kedua template
│   ├── gateway/          # Nginx satu origin
│   └── php/              # legacy rollback candidate, tidak aktif
├── .env.example
├── .dockerignore
└── docker-compose.yml
```

## Tidak Boleh Dimasukkan

Dokumen planning baru, asset desain, credential baru yang tidak aman.

## Menjalankan

Sekali di awal, siapkan environment API:

```bash
cp .env.example .env
openssl rand -hex 32          # tempel ke JWT_SECRET
# isi ADMIN_EMAIL dan ADMIN_PASSWORD
```

Lalu:

```bash
docker compose config --quiet
docker compose up -d --build
```

| Alamat | Isi |
|---|---|
| `http://localhost:1080/` | Homepage publik React |
| `http://localhost:1080/auth/` | Halaman login |
| `http://localhost:1080/adminpanel/dashboard.html` | Dashboard admin (wajib sesi) |
| `http://localhost:1080/health` | Health check React |
| `http://localhost:1080/api-health` | Health check API |

## Verifikasi

```bash
docker compose config --quiet
docker compose build
cd _app_padev_landing && npm test          # test frontend publik
cd ../_api_padev && npm test        # test token dan pembatas login
```

Route `/auth`, `/adminpanel`, dan `/api` tidak lagi mengembalikan `404`: ketiganya
dilayani `_api_padev` melalui gateway. Project brief masih diproses lokal;
kanal kontak eksternal belum diaktifkan karena URL resmi belum tersedia.

## Catatan untuk Codex/AI

Jangan menghapus volume dan jangan menyentuh tabel legacy CodeIgniter 4 +
Shield (`users`, `auth_identities`, `auth_groups_users`, dan seterusnya) di
database `pa_dev` — tabel itu berisi data dan bukan milik runtime ini. Tabel
milik API semuanya berawalan `padev_`. Jalankan Docker dari folder ini.

Pembagian kepemilikan berkas ada di
`00 Governance/HANDOVER_2026-08-09_AUTH_ADMIN.md`.
