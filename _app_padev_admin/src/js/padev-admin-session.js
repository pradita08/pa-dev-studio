/**
 * PA DEV Admin — sesi nyata untuk template admin.
 *
 * Halaman admin sudah dijaga di server: middleware menolak request tanpa
 * cookie sesi yang sah sebelum berkas HTML dikirim. Berkas ini menangani sisa
 * yang hanya bisa dikerjakan di browser:
 *
 *   1. mengisi nama/peran pengguna pada trigger profil dan ringkasan menu,
 *   2. mengubah tautan "Keluar" dari demo `login.html` menjadi logout nyata,
 *   3. menyegarkan sesi secara diam-diam saat access token sudah kedaluwarsa
 *      tetapi refresh token masih berlaku.
 *
 * Markup template tidak diubah; hanya teks dan perilaku tautan yang diisi.
 */
'use strict';

(function initAdminSession() {
  const request = (path, options = {}) => fetch(path, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const toAuth = () => {
    const next = window.location.pathname + window.location.search;
    window.location.replace(`/auth/?next=${encodeURIComponent(next)}`);
  };

  const initials = (name) => (name || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'A';

  const paint = (user) => {
    const label = user.name || user.email;
    const role = user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Pengguna';

    // Trigger profil di navbar dan ringkasan di dalam dropdown memakai struktur
    // yang sama: dua span teks berurutan (nama lalu peran).
    document.querySelectorAll('.profile-trigger > span:nth-child(2), .profile-menu-summary > span:last-child')
      .forEach((wrap) => {
        const lines = wrap.querySelectorAll('span');
        if (lines[0]) {
          lines[0].textContent = label;
          lines[0].removeAttribute('data-i18n');   // jangan ditimpa auto-translate
        }
        if (lines[1]) {
          lines[1].textContent = role;
          lines[1].removeAttribute('data-i18n');
        }
      });

    /* Avatar.
     *
     * Urutannya: foto yang diunggah pengguna di halaman Profil, lalu inisial.
     * Gambar demo bawaan template BUKAN pilihan ketiga yang setara — begitu
     * sebuah akun nyata masuk, wajah orang lain di pojok kanan atas adalah
     * kekeliruan yang paling lama tidak disadari. Jadi ia hanya bertahan
     * selama akun itu memang belum punya foto sendiri. */
    document.querySelectorAll('.profile-trigger > span:first-child, .profile-menu-summary > span:first-child')
      .forEach((avatar) => {
        const image = avatar.querySelector('img');
        if (user.avatarUrl) {
          if (image) {
            image.src = user.avatarUrl;
            image.alt = label;
            return;
          }
          const baru = document.createElement('img');
          baru.src = user.avatarUrl;
          baru.alt = label;
          baru.className = 'absolute inset-0 h-full w-full object-cover';
          avatar.textContent = initials(label);
          avatar.append(baru);
          return;
        }
        image?.remove();
        avatar.textContent = initials(label);
      });

    document.title = document.title.replace(/^Dashboard/, `Dashboard ${label.split(' ')[0]}`);
  };

  const bindLogout = () => {
    const links = new Set([
      ...document.querySelectorAll('[data-padev-logout]'),
      ...[...document.querySelectorAll('a[href$="login.html"]')].filter(
        (link) => link.closest('[data-dropdown-panel]') || link.closest('.profile-menu-summary'),
      ),
    ]);

    links.forEach((link) => {
      link.setAttribute('href', '/auth/');
      link.addEventListener('click', (event) => {
        event.preventDefault();
        request('/api/auth/logout', { method: 'POST' })
          .catch(() => null)
          .then(() => {
            try { window.sessionStorage.removeItem('padev.accessToken'); } catch (_) { /* mode privat */ }
            window.location.replace('/auth/');
          });
      });
    });
  };

  /**
   * Menu profil di navbar.
   *
   * Template menautkannya ke `profile.html` dan `preferences.html`. Kedua
   * halaman itu demo tema dan sudah dilepas saat perampingan, sehingga
   * tautannya kini berakhir di 404. Diarahkan ulang ke tujuan yang benar-benar
   * ada: halaman profil milik User Management, dan panel tema yang memang sudah
   * berjalan sebagai komponen runtime.
   */
  const bindMenuProfil = () => {
    const profil = document.querySelector('[data-dropdown-panel] a[href$="profile.html"]');
    if (profil) profil.setAttribute('href', '/adminpanel/padev-profile.html');

    const tema = document.querySelector('[data-dropdown-panel] a[href$="preferences.html"]');
    if (tema) {
      tema.setAttribute('href', '#');
      tema.addEventListener('click', (event) => {
        event.preventDefault();
        // Panel tema sudah tersedia sebagai komponen runtime; pemicunya
        // menempel di tepi kanan layar.
        document.querySelector('[data-theme-customizer-toggle], [data-theme-customizer-open], [data-theme-customizer]')?.click();
      });
    }
  };

  const load = () => request('/api/auth/me')
    .then((response) => {
      if (response.status !== 401) return response;
      // Access token habis — coba tukar dengan refresh token satu kali.
      return request('/api/auth/refresh', { method: 'POST' })
        .then((refreshed) => (refreshed.ok ? request('/api/auth/me') : response));
    })
    .then((response) => {
      if (!response.ok) {
        toAuth();
        return;
      }
      return response.json().then((payload) => {
        if (payload?.user) paint(payload.user);
        bindLogout();
        bindMenuProfil();
      });
    })
    .catch(() => {
      // Jaringan gagal: jangan tendang pengguna keluar, cukup pasang logout.
      bindLogout();
      bindMenuProfil();
    });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load, { once: true });
  } else {
    load();
  }

  /* Halaman Profil memberi kabar setelah foto diganti atau dihapus.
   *
   * Yang dikirim hanya kabarnya, bukan URL fotonya: identitas dibaca ulang
   * dari server, jadi avatar di navbar tidak pernah menampilkan sesuatu yang
   * ternyata gagal tersimpan. Selektor avatar tetap hidup di satu tempat —
   * berkas ini. */
  document.addEventListener('padev:profil-berubah', () => {
    request('/api/auth/me')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => { if (data?.user) paint(data.user); })
      .catch(() => { /* biarkan avatar apa adanya */ });
  });
}());
