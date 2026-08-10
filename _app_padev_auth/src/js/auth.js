/**
 * PA DEV Auth — perilaku & motion halaman autentikasi.
 *
 * Timing mengikuti catatan animasi di source/refrences/auth_page_1..5.png:
 *   durasi 250–350ms · easing ease-out-cubic · stagger 80ms antar field
 *   ornamen loop 6s yoyo · shake validasi 3x amplitudo 6px
 *   tick checkbox 0.8→1.2 · press tombol 0.97 · pulse sukses 2x
 *
 * Semua demo statis: TIDAK ada request ke backend mana pun. Form hanya
 * divalidasi di sisi klien lalu menampilkan keadaan berhasil/gagal.
 *
 * Kontrak atribut (markup boleh diganti selama atribut ini dipertahankan):
 *   [data-auth]                akar halaman
 *   [data-auth-form]           form yang divalidasi
 *   [data-auth-reveal]         elemen yang muncul saat masuk viewport
 *   [data-auth-seq]            indeks stagger dalam satu grup
 *   [data-auth-password]       input yang punya tombol mata
 *   [data-auth-strength]       wadah meter kekuatan kata sandi
 *   [data-auth-countdown]      hitung mundur (target di data-target)
 *   [data-auth-progress]       bar progres (nilai di data-value)
 *   [data-auth-resend]         tombol kirim ulang dengan jeda
 */
'use strict';

(function initAuth() {
  const root = document.querySelector('[data-auth]');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t = (key, fallback) => window.PADevI18n?.t?.(key) ?? fallback;

  /* ===================== Navbar lengket ===================== */
  const topbar = root.querySelector('[data-landing-topbar]');
  if (topbar) {
    const sync = () => topbar.classList.toggle('is-stuck', window.scrollY > 8);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
  }

  /* ===================== Menu mobile ===================== */
  const burger = root.querySelector('[data-landing-burger]');
  const mobile = root.querySelector('[data-landing-mobile]');
  if (burger && mobile) {
    const setOpen = (open) => {
      mobile.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    setOpen(false);
    burger.addEventListener('click', () => setOpen(!mobile.classList.contains('is-open')));
    mobile.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ===================== Tema terang/gelap =====================
   * Memakai kunci localStorage yang SAMA dengan admin & frontpage supaya
   * preferensi terbawa saat pengguna berpindah antar produk. */
  const html = document.documentElement;
  const applyAppearance = (value) => {
    const resolved = value === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : value;
    html.dataset.paTheme = resolved;
    html.dataset.padevAppearance = value;
    try { window.localStorage.setItem('padev.appearance', value); } catch (_) { /* mode privat */ }
    root.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', String(resolved === 'dark'));
      btn.querySelectorAll('[data-theme-icon]').forEach((icon) => {
        icon.classList.toggle('hidden', icon.dataset.themeIcon !== resolved);
      });
    });
  };
  applyAppearance(html.dataset.padevAppearance || 'light');
  root.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => applyAppearance(html.dataset.paTheme === 'dark' ? 'light' : 'dark'));
  });

  /* ===================== Reveal + stagger =====================
   * Sama seperti landing: bawaannya TERLIHAT di CSS, baru disembunyikan di sini.
   * Kalau modul ini tidak jalan, halaman tetap utuh terbaca. */
  const reveals = [...root.querySelectorAll('[data-auth-reveal]')];
  if (reveals.length && !reduceMotion && 'IntersectionObserver' in window) {
    root.dataset.authAnim = '';

    const show = (el) => {
      if (el.classList.contains('is-visible')) return;
      const fixed = Number(el.dataset.authDelay);
      const seq = Number(el.dataset.authSeq);
      const gap = Number(el.closest('[data-auth-stagger]')?.dataset.authStagger || 80);
      const delay = Number.isFinite(fixed) ? fixed : (Number.isFinite(seq) ? seq * gap : 0);
      window.setTimeout(() => el.classList.add('is-visible'), delay);
      io.unobserve(el);
    };

    // Menyapu elemen yang sudah di viewport tanpa menunggu observer — pada
    // pemuatan tertentu notifikasi pertamanya bisa tidak pernah datang.
    const sweep = () => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      reveals.forEach((el) => {
        if (el.classList.contains('is-visible')) return;
        const box = el.getBoundingClientRect();
        if (box.top < h * 0.94 && box.bottom > 0) show(el);
      });
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0 });

    reveals.forEach((el) => io.observe(el));
    sweep();
    window.requestAnimationFrame(sweep);
    window.addEventListener('load', sweep, { once: true });
    window.addEventListener('scroll', sweep, { passive: true });
  }

  /* ===================== Tombol mata kata sandi ===================== */
  root.querySelectorAll('[data-auth-password]').forEach((wrap) => {
    const input = wrap.querySelector('input');
    const button = wrap.querySelector('.auth-eye');
    if (!input || !button) return;
    button.addEventListener('click', () => {
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', t(show ? 'auth.hidePassword' : 'auth.showPassword',
        show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'));
      button.querySelectorAll('svg').forEach((svg) => {
        svg.classList.toggle('hidden', (svg.dataset.eye === 'open') === show);
      });
    });
  });

  /* ===================== Meter kekuatan kata sandi =====================
   * Empat syarat sederhana; setiap syarat terpenuhi menaikkan satu tingkat.
   * Bukan pengukur entropi sungguhan — ini demo statis dan tidak boleh
   * memberi kesan menilai keamanan sandi sebenarnya. */
  const RULES = [
    ['length', (v) => v.length >= 8],
    ['case', (v) => /[a-z]/.test(v) && /[A-Z]/.test(v)],
    ['number', (v) => /\d/.test(v)],
    ['symbol', (v) => /[^A-Za-z0-9]/.test(v)],
  ];
  const LABELS = ['auth.strength.none', 'auth.strength.weak', 'auth.strength.fair', 'auth.strength.good', 'auth.strength.strong'];
  const FALLBACK = ['—', 'Lemah', 'Cukup', 'Baik', 'Kuat'];

  root.querySelectorAll('[data-auth-strength]').forEach((meter) => {
    const input = document.getElementById(meter.dataset.authStrength);
    const label = meter.querySelector('[data-strength-label]');
    if (!input) return;
    const sync = () => {
      const value = input.value;
      const met = RULES.filter(([, test]) => test(value));
      const level = value ? met.length : 0;
      meter.dataset.level = String(level);
      if (label) label.textContent = t(LABELS[level], FALLBACK[level]);
      RULES.forEach(([name, test]) => {
        meter.querySelector(`[data-rule="${name}"]`)?.classList.toggle('is-met', test(value));
      });
    };
    input.addEventListener('input', sync);
    sync();
  });

  /* ===================== Validasi form =====================
   * Divalidasi di klien saja. Field yang gagal digetarkan (3x, 6px) dan
   * mendapat aria-invalid supaya pembaca layar ikut memberitahu. */
  const shake = (el) => {
    if (reduceMotion) return;
    el.classList.remove('auth-shake');
    void el.offsetWidth; // paksa reflow agar animasi bisa diputar ulang
    el.classList.add('auth-shake');
  };

  const messageFor = (input) => {
    if (input.validity.valueMissing) return t('auth.err.required', 'Bagian ini wajib diisi.');
    if (input.validity.typeMismatch && input.type === 'email') return t('auth.err.email', 'Masukkan alamat email yang valid.');
    if (input.validity.tooShort) return t('auth.err.short', `Minimal ${input.minLength} karakter.`);
    return t('auth.err.invalid', 'Nilai ini belum sesuai.');
  };

  root.querySelectorAll('[data-auth-form]').forEach((form) => {
    const banner = form.querySelector('[data-auth-banner]');
    const success = form.querySelector('[data-auth-success]');
    const submit = form.querySelector('[type="submit"]');

    const setError = (input, message) => {
      const field = input.closest('.auth-field') || input.parentElement;
      const slot = field?.querySelector('[data-auth-error]');
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
      if (slot) slot.textContent = message || '';
      if (message) shake(field);
    };

    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true' && input.checkValidity()) setError(input, '');
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      let firstBad = null;

      form.querySelectorAll('input[required], input[type="email"]').forEach((input) => {
        const ok = input.checkValidity();
        setError(input, ok ? '' : messageFor(input));
        if (!ok && !firstBad) firstBad = input;
      });

      // Konfirmasi kata sandi harus sama — tidak tertangkap validitas bawaan.
      const pw = form.querySelector('[data-password-main]');
      const pw2 = form.querySelector('[data-password-confirm]');
      if (pw && pw2 && pw2.value !== pw.value) {
        setError(pw2, t('auth.err.match', 'Konfirmasi kata sandi belum sama.'));
        if (!firstBad) firstBad = pw2;
      }

      if (firstBad) {
        banner?.classList.remove('hidden');
        success?.classList.add('hidden');
        firstBad.focus();
        return;
      }

      banner?.classList.add('hidden');

      // Keadaan memuat lalu berhasil — murni tampilan, tanpa request.
      if (submit) {
        const original = submit.innerHTML;
        submit.disabled = true;
        submit.innerHTML = `<span class="auth-spinner" aria-hidden="true"></span><span>${t('auth.processing', 'Memproses…')}</span>`;
        window.setTimeout(() => {
          submit.disabled = false;
          submit.innerHTML = original;
          success?.classList.remove('hidden');
          success?.focus?.();
        }, 900);
      } else {
        success?.classList.remove('hidden');
      }
    });
  });

  /* ===================== Tutup banner ===================== */
  root.querySelectorAll('[data-auth-banner-close]').forEach((button) => {
    button.addEventListener('click', () => button.closest('[data-auth-banner]')?.classList.add('hidden'));
  });

  /* ===================== Kirim ulang dengan jeda =====================
   * Mencegah klik beruntun sekaligus memberi umpan balik sisa waktu. */
  root.querySelectorAll('[data-auth-resend]').forEach((button) => {
    const seconds = Number(button.dataset.authResend) || 45;
    const label = button.dataset.resendLabel || button.textContent.trim();
    let remaining = 0;
    let timer = null;
    const render = () => {
      if (remaining <= 0) {
        button.disabled = false;
        button.textContent = label;
        window.clearInterval(timer);
        return;
      }
      const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
      const ss = String(remaining % 60).padStart(2, '0');
      button.textContent = `${t('auth.resendIn', 'Kirim ulang')} (${mm}:${ss})`;
      remaining -= 1;
    };
    const start = () => {
      remaining = seconds;
      button.disabled = true;
      render();
      timer = window.setInterval(render, 1000);
    };
    button.addEventListener('click', () => { if (!button.disabled) start(); });
    start();
  });

  /* ===================== Hitung mundur (Coming Soon) ===================== */
  root.querySelectorAll('[data-auth-countdown]').forEach((box) => {
    // Target dari atribut, atau 12 hari dari sekarang sebagai demo.
    const target = box.dataset.target
      ? new Date(box.dataset.target).getTime()
      : Date.now() + 12 * 864e5 + 8 * 36e5 + 34 * 6e4 + 56e3;
    const cells = ['days', 'hours', 'minutes', 'seconds']
      .map((k) => box.querySelector(`[data-unit="${k}"]`));
    const tick = () => {
      const left = Math.max(0, target - Date.now());
      const v = [
        Math.floor(left / 864e5),
        Math.floor(left / 36e5) % 24,
        Math.floor(left / 6e4) % 60,
        Math.floor(left / 1e3) % 60,
      ];
      cells.forEach((cell, i) => {
        if (!cell) return;
        const next = String(v[i]).padStart(2, '0');
        if (cell.textContent === next) return;
        cell.textContent = next;
        if (reduceMotion) return;
        cell.classList.remove('is-flip');
        void cell.offsetWidth;
        cell.classList.add('is-flip');
      });
    };
    tick();
    window.setInterval(tick, 1000);
  });

  /* ===================== Bar progres (Maintenance) ===================== */
  root.querySelectorAll('[data-auth-progress]').forEach((wrap) => {
    const bar = wrap.querySelector('.auth-progress-bar');
    const value = Math.min(100, Math.max(0, Number(wrap.dataset.value) || 72));
    if (!bar) return;
    bar.style.width = '0%';
    wrap.setAttribute('role', 'progressbar');
    wrap.setAttribute('aria-valuenow', String(value));
    wrap.setAttribute('aria-valuemin', '0');
    wrap.setAttribute('aria-valuemax', '100');
    window.requestAnimationFrame(() => { bar.style.width = `${value}%`; });
  });

  /* ===================== Penanda halaman aktif =====================
   * Strip chip di bawah halaman berfungsi sebagai penunjuk posisi, jadi chip
   * yang sedang dibuka perlu ditandai — untuk mata maupun pembaca layar. */
  const here = window.location.pathname.split('/').pop() || 'index.html';
  root.querySelectorAll('.auth-page-chip').forEach((chip) => {
    const target = chip.getAttribute('href').split('/').pop();
    if (target === here) chip.setAttribute('aria-current', 'page');
  });


  /* ===================== Pengalih produk PA DEV Suite =====================
   * Source memakai jalur Docker suite (/admin, /auth, /). Saat salah satu
   * server npm aktif pada 4173/4174/4175, seluruh tautan lintas produk diubah
   * ke server npm yang tepat pada host yang sama. */
  const npmSuitePorts = { admin: '4173', frontpage: '4174', auth: '4175' };
  if (Object.values(npmSuitePorts).includes(window.location.port)) {
    const routeMap = [
      { prefix: '/admin', port: npmSuitePorts.admin },
      { prefix: '/auth', port: npmSuitePorts.auth },
      { prefix: '/', port: npmSuitePorts.frontpage },
    ];
    root.querySelectorAll('a[href^="/"]').forEach((link) => {
      const url = new URL(link.getAttribute('href'), window.location.origin);
      const route = routeMap.find(({ prefix }) => (
        prefix === '/'
        || url.pathname === prefix
        || url.pathname.startsWith(`${prefix}/`)
      ));
      if (!route) return;
      const pathname = route.prefix === '/'
        ? url.pathname
        : (url.pathname.slice(route.prefix.length) || '/');
      link.href = `${window.location.protocol}//${window.location.hostname}:${route.port}${pathname}${url.search}${url.hash}`;
    });
  }

  /* Menandai produk yang sedang dibuka.
   *
   * Pembedanya bisa PORT (tiap produk npm: 4173/4174/4175) atau PATH
   * (di container suite: /, /auth/, /admin/). Karena itu penentuannya tidak
   * boleh mengandalkan salah satunya saja: yang dipakai adalah tautan dengan
   * origin sama DAN awalan path terpanjang yang cocok. Dengan begitu berpindah
   * dari port ke path nanti tidak perlu mengubah berkas ini. */
  const suiteItems = [...root.querySelectorAll('[data-suite]')];
  if (suiteItems.length) {
    let best = null;
    let bestLen = -1;
    suiteItems.forEach((item) => {
      const url = new URL(item.getAttribute('href'), window.location.href);
      if (url.origin !== window.location.origin) return;
      const base = url.pathname.replace(/\/$/, '');
      if (base && !window.location.pathname.startsWith(base + '/')
          && window.location.pathname !== base) return;
      if (base.length > bestLen) { bestLen = base.length; best = item; }
    });
    if (best) best.setAttribute('aria-current', 'page');
  }

  /* ===================== Tahun berjalan ===================== */
  root.querySelectorAll('[data-landing-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  root.dataset.authReady = 'true';
})();
