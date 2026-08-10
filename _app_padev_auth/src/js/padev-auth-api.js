/**
 * PA DEV Auth — jembatan form login ke API JWT.
 *
 * Template bawaan (`auth.js`) sengaja dibuat demo statis: submit hanya
 * divalidasi di klien lalu menampilkan banner sukses palsu. Berkas ini
 * mengambil alih submit halaman login SEBELUM handler demo tersebut jalan,
 * lalu mengirim kredensial ke `/api/auth/login`.
 *
 * Cara mengambil alih: listener dipasang pada `document` fase CAPTURE. Pada
 * fase target, listener capture dan bubble di elemen yang sama dijalankan
 * menurut urutan pendaftaran — jadi memasangnya di form tidak cukup karena
 * `auth.js` dimuat lebih dulu. Capture di ancestor selalu lebih dulu, dan
 * `stopPropagation()` membuat event tidak pernah sampai ke handler demo.
 *
 * Markup template tidak diubah. Berkas ini hanya memakai kontrak atribut yang
 * sudah ada: [data-auth-form], [data-auth-banner], [data-auth-success],
 * [data-auth-error], sehingga tampilan loading/error/sukses tetap identik.
 */
'use strict';

(function initAuthApi() {
  const form = document.querySelector('[data-auth-form]');
  const email = document.getElementById('login-email');
  const password = document.getElementById('login-password');

  // Hanya halaman login yang punya ketiganya. Halaman register, forgot, dan
  // status sistem dibiarkan apa adanya sampai alurnya dibuka di fase lain.
  if (!form || !email || !password) return;

  const t = (key, fallback) => window.PADevI18n?.t?.(key) ?? fallback;
  const banner = form.querySelector('[data-auth-banner]');
  const bannerText = banner?.querySelector('span');
  const success = form.querySelector('[data-auth-success]');
  const successText = success?.querySelector('span');
  const submit = form.querySelector('[type="submit"]');

  const setFieldError = (input, message) => {
    const field = input.closest('.auth-field') || input.parentElement;
    const slot = field?.querySelector('[data-auth-error]');
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (slot) slot.textContent = message || '';
  };

  const showBanner = (message) => {
    if (bannerText && message) bannerText.textContent = message;
    banner?.classList.remove('hidden');
    success?.classList.add('hidden');
  };

  const showSuccess = (message) => {
    if (successText && message) successText.textContent = message;
    banner?.classList.add('hidden');
    success?.classList.remove('hidden');
    success?.focus?.();
  };

  // Tujuan setelah login. `next` hanya diterima kalau berupa path relatif di
  // origin yang sama — mencegah open redirect lewat query string. Bila tidak
  // ada, server yang menentukan lewat `redirectTo`, karena hanya server yang
  // tahu halaman mana yang boleh dibuka pengguna ini.
  const safeNext = (redirectTo) => {
    const raw = new URLSearchParams(window.location.search).get('next');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return redirectTo || '/auth/';
  };

  const messageFor = (response, payload) => {
    if (payload?.message) return payload.message;
    if (response.status === 401) return t('auth.login.error', 'Email atau password salah. Silakan coba lagi.');
    if (response.status === 429) return 'Terlalu banyak percobaan login. Coba lagi beberapa saat lagi.';
    if (response.status === 403) return 'Akun Anda belum aktif. Hubungi administrator.';
    return 'Tidak dapat terhubung ke server autentikasi. Coba lagi.';
  };

  // Login pihak ketiga (Google, GitHub) belum tersambung ke backend: belum ada
  // client ID maupun alur callback. Tombolnya tetap ditampilkan sesuai desain,
  // tetapi harus mengatakan keadaan sebenarnya — bukan diam saja.
  document.querySelectorAll('[data-auth-oauth]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      showBanner(`Login ${button.dataset.authOauth} belum diaktifkan. Silakan masuk dengan email dan password.`);
    });
  });

  let sending = false;

  document.addEventListener('submit', (event) => {
    if (event.target !== form) return;

    event.preventDefault();
    event.stopPropagation();   // menghentikan handler demo di auth.js
    if (sending) return;

    let firstBad = null;
    const required = [
      [email, t('auth.err.email', 'Masukkan alamat email yang valid.')],
      [password, t('auth.err.required', 'Bagian ini wajib diisi.')],
    ];

    for (const [input, message] of required) {
      const ok = input.checkValidity();
      setFieldError(input, ok ? '' : message);
      if (!ok && !firstBad) firstBad = input;
    }

    if (firstBad) {
      showBanner(t('auth.login.error', 'Email atau password salah. Silakan coba lagi.'));
      firstBad.focus();
      return;
    }

    banner?.classList.add('hidden');
    sending = true;

    const original = submit ? submit.innerHTML : '';
    if (submit) {
      submit.disabled = true;
      submit.innerHTML = `<span class="auth-spinner" aria-hidden="true"></span><span>${t('auth.processing', 'Memproses…')}</span>`;
    }

    const restore = () => {
      sending = false;
      if (submit) {
        submit.disabled = false;
        submit.innerHTML = original;
      }
    };

    fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: email.value.trim(),
        password: password.value,
        remember: form.querySelector('input[name="remember"]')?.checked !== false,
      }),
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          restore();
          showBanner(messageFor(response, payload));
          password.focus();
          password.select?.();
          return;
        }

        // Cookie sesi sudah dipasang server. Token di body disimpan hanya untuk
        // pemanggilan API bergaya Bearer dari halaman admin bila diperlukan.
        try {
          window.sessionStorage.setItem('padev.accessToken', payload?.accessToken || '');
        } catch (_) { /* mode privat */ }

        showSuccess('Login berhasil. Mengalihkan…');
        window.setTimeout(() => window.location.assign(safeNext(payload?.redirectTo)), 450);
      })
      .catch(() => {
        restore();
        showBanner('Tidak dapat terhubung ke server autentikasi. Coba lagi.');
      });
  }, true);
}());
