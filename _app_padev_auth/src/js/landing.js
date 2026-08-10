/**
 * PA DEV Landing — perilaku & motion halaman publik.
 *
 * Timing di berkas ini BUKAN kira-kira: seluruhnya mengikuti spesifikasi di
 * source/refrences/landing_page_1..5.png.
 *
 *   PAGE LOAD    0.0s  navbar fade-down
 *   HERO REVEAL  0.1s  badge · 0.2s heading · 0.4s subtext · 0.5s CTA
 *                0.7s  mockup dashboard masuk
 *   STATS        count-up saat masuk viewport, jeda 200ms antar item
 *   FEATURES     stagger 80ms
 *   WORKFLOW     stagger 150ms
 *   PARTNER      loop mulus 20–30px/detik
 *   CTA          pulse tiap 4s
 *   trigger      15% dari viewport · easing cubic-bezier(0.22,1,0.36,1)
 *
 * Semua progressive enhancement: tanpa JS halaman tetap terbaca penuh dan
 * seluruh tautan anchor tetap berfungsi.
 *
 * Kontrak atribut (markup boleh diganti total selama atribut ini dipertahankan):
 *   [data-landing]            akar halaman
 *   [data-landing-topbar]     navbar lengket — dapat .is-stuck saat digulir
 *   [data-landing-burger]     tombol menu mobile
 *   [data-landing-mobile]     panel menu mobile
 *   [data-landing-nav]        wadah tautan nav untuk scroll-spy
 *   [data-landing-reveal]     elemen yang muncul saat masuk viewport
 *   [data-landing-seq]        indeks urutan stagger dalam satu grup
 *   [data-landing-delay]      penundaan tetap dalam ms (dipakai hero)
 *   [data-count-to]           angka tujuan count-up
 *   [data-landing-parallax]   faktor gerak parallax (desktop saja)
 *   [data-theme-toggle]       tombol terang/gelap
 *   [data-landing-year]       tahun berjalan
 */
'use strict';

(function initLanding() {
  const root = document.querySelector('[data-landing]');
  if (!root) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = () => window.matchMedia('(min-width: 1200px)').matches;

  /* ===================== Navbar lengket ===================== */
  const topbar = root.querySelector('[data-landing-topbar]');
  if (topbar) {
    const syncStuck = () => topbar.classList.toggle('is-stuck', window.scrollY > 8);
    syncStuck();
    window.addEventListener('scroll', syncStuck, { passive: true });
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
    // Panel menutup sendiri setelah tautan dipilih, kalau tidak ia menghalangi
    // bagian yang baru saja dituju.
    mobile.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
  }

  /* ===================== Tema terang/gelap =====================
   * Memakai kunci localStorage yang SAMA dengan admin (padev.appearance)
   * supaya preferensi terbawa saat pengguna berpindah ke dashboard. */
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
    btn.addEventListener('click', () => {
      applyAppearance(html.dataset.paTheme === 'dark' ? 'light' : 'dark');
    });
  });

  /* ===================== Gulir halus ke anchor =====================
   * Offset dihitung dari tinggi navbar yang sebenarnya, bukan angka tetap,
   * supaya judul bagian tidak tertutup saat navbar berubah tinggi di
   * breakpoint yang berbeda. */
  const offsetFor = () => (topbar ? topbar.getBoundingClientRect().height : 0) + 16;

  root.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const id = link.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - offsetFor(),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
    history.replaceState(null, '', `#${id}`);
  });

  /* ===================== Scroll-spy ===================== */
  const navLinks = [...root.querySelectorAll('[data-landing-nav] a[href^="#"]')];
  const sections = navLinks
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  if (sections.length && 'IntersectionObserver' in window) {
    const mark = (id) => navLinks.forEach((a) => {
      a.classList.toggle('is-current', a.getAttribute('href') === `#${id}`);
    });
    const spy = new IntersectionObserver((entries) => {
      const top = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (top) mark(top.target.id);
    }, { rootMargin: `-${Math.round(offsetFor())}px 0px -58% 0px`, threshold: 0 });
    sections.forEach((s) => spy.observe(s));
  }

  /* ===================== Count-up angka statistik =====================
   * Memformat ulang lewat pemisah ribuan dan mempertahankan awalan/akhiran
   * (25K+, 99.9%, 24/7) apa adanya dari markup. */
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  function countUp(el) {
    const target = Number(el.dataset.countTo);
    if (!Number.isFinite(target)) return;
    const decimals = Number(el.dataset.countDecimals || 0);
    const prefix = el.dataset.countPrefix || '';
    const suffix = el.dataset.countSuffix || '';
    const duration = Number(el.dataset.countDuration || 1400);
    if (reduceMotion) {
      el.textContent = prefix + target.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const value = target * easeOut(p);
      el.textContent = prefix + value.toLocaleString('id-ID', {
        minimumFractionDigits: decimals, maximumFractionDigits: decimals,
      }) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  /* ===================== Reveal saat digulir =====================
   * Kontraknya dibalik dari cara yang lazim: di CSS elemen ini TERLIHAT secara
   * bawaan, dan baru disembunyikan setelah data-landing-anim dipasang di sini.
   * Jadi kalau modul ini tidak jalan, halaman tetap utuh terbaca. */
  const reveals = [...root.querySelectorAll('[data-landing-reveal]')];

  if (reveals.length && !reduceMotion && 'IntersectionObserver' in window) {
    root.dataset.landingAnim = '';

    const show = (el) => {
      if (el.classList.contains('is-visible')) return;
      // Penundaan: data-landing-delay (tetap, dipakai hero saat load) atau
      // data-landing-seq x jarak stagger grupnya.
      const fixed = Number(el.dataset.landingDelay);
      const seq = Number(el.dataset.landingSeq);
      const gap = Number(el.closest('[data-landing-stagger]')?.dataset.landingStagger || 80);
      const delay = Number.isFinite(fixed) ? fixed : (Number.isFinite(seq) ? seq * gap : 0);
      window.setTimeout(() => {
        el.classList.add('is-visible');
        el.querySelectorAll('[data-count-to]').forEach((n, i) => window.setTimeout(() => countUp(n), i * 200));
      }, delay);
      io.unobserve(el);
    };

    /* Menyapu elemen yang SUDAH di viewport tanpa menunggu observer.
     * IntersectionObserver hanya mengirim notifikasi saat ada frame render; pada
     * pemuatan yang langsung melompat ke anchor notifikasi pertamanya bisa tidak
     * pernah datang, dan elemennya tertinggal tak terlihat. */
    const sweep = () => {
      const h = window.innerHeight || document.documentElement.clientHeight;
      reveals.forEach((el) => {
        if (el.classList.contains('is-visible')) return;
        const box = el.getBoundingClientRect();
        if (box.top < h * 0.92 && box.bottom > 0) show(el);
      });
    };

    // rootMargin bawah -15% = trigger saat elemen 15% masuk viewport.
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) show(e.target); });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0 });

    reveals.forEach((el) => io.observe(el));

    sweep();
    window.requestAnimationFrame(sweep);
    window.addEventListener('load', sweep, { once: true });
    window.addEventListener('hashchange', () => window.requestAnimationFrame(sweep));
    // Jaring pengaman: kalaupun observer tidak pernah mengirim notifikasi,
    // menggulir saja sudah cukup untuk memunculkan elemennya.
    window.addEventListener('scroll', sweep, { passive: true });
  } else {
    // Tanpa animasi: tampilkan semuanya dan jalankan count-up sekali.
    root.querySelectorAll('[data-count-to]').forEach(countUp);
  }

  /* ===================== Parallax ringan =====================
   * Hanya desktop (referensi #4). Dibaca lewat rAF supaya tidak ada layout
   * thrashing saat menggulir. */
  const parallax = [...root.querySelectorAll('[data-landing-parallax]')];
  if (parallax.length && !reduceMotion) {
    let ticking = false;
    const update = () => {
      ticking = false;
      if (!isDesktop()) { parallax.forEach((el) => { el.style.transform = ''; }); return; }
      const y = window.scrollY;
      parallax.forEach((el) => {
        const factor = Number(el.dataset.landingParallax) || 0.05;
        el.style.transform = `translate3d(0, ${(y * factor).toFixed(2)}px, 0)`;
      });
    };
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  /* ===================== Partner strip =====================
   * Daftar digandakan agar loop translateX(-50%) tersambung mulus. Kecepatannya
   * ditetapkan dari lebar sebenarnya supaya konsisten ~26px/detik berapa pun
   * jumlah logonya. */
  root.querySelectorAll('[data-landing-marquee]').forEach((track) => {
    if (track.dataset.marqueeReady === 'true') return;
    track.append(...[...track.children].map((n) => {
      const clone = n.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      return clone;
    }));
    const width = track.scrollWidth / 2;
    if (width > 0) track.style.animationDuration = `${Math.round(width / 26)}s`;
    track.dataset.marqueeReady = 'true';
  });

  /* ===================== Newsletter (demo statis) ===================== */
  root.querySelectorAll('[data-newsletter]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const note = form.querySelector('[data-newsletter-note]');
      const input = form.querySelector('input[type="email"]');
      if (!note || !input) return;
      const ok = input.checkValidity() && input.value.trim() !== '';
      note.textContent = window.PADevI18n?.t?.(ok ? 'landing.footer.newsOk' : 'landing.footer.newsErr')
        ?? (ok ? 'Terima kasih! Ini demo statis — tidak ada data yang dikirim.' : 'Masukkan alamat email yang valid.');
      if (ok) input.value = '';
    });
  });

  /* ===================== Tahun berjalan ===================== */
  root.querySelectorAll('[data-landing-year]').forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  root.dataset.landingReady = 'true';
})();
