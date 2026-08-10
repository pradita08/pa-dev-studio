"""Bangun seluruh halaman PA DEV Auth dari satu sumber shell.

Shell (navbar + strip fitur + footer) ditulis SEKALI di sini lalu disisipkan ke
setiap halaman, supaya 15 halaman tidak pelan-pelan jadi berbeda. Keluarannya
HTML statis biasa di src/pages/ — sama seperti pola halaman lain di repo ini.

Menjalankan dari akar proyek:  python3 scripts/build-pages.py
"""
import os, re

# Jalur relatif terhadap berkas ini, supaya proyek bisa dipindah folder.
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))

# =========================================================================== #
# ALAMAT ANTAR PRODUK — SATU-SATUNYA TEMPAT MENGUBAHNYA
#
# Source memakai jalur suite satu-container. Saat halaman dijalankan melalui
# npm pada port 4173/4174/4175, auth.js mengubah tautan ini ke port npm yang
# sesuai pada host yang sama. Tidak perlu cari-ganti manual antar-runtime.
# =========================================================================== #
SUITE_FRONTPAGE = ''
SUITE_AUTH      = '/auth'
SUITE_ADMIN     = '/admin'

ADMIN = SUITE_ADMIN
HOME = SUITE_FRONTPAGE + '/'

# --------------------------------------------------------------------------- #
# Ikon (inline SVG, stroke=currentColor supaya ikut token warna)
# --------------------------------------------------------------------------- #
def svg(body, extra=''):
    """Atribut tambahan MENGGANTI bawaan, bukan ditambahkan di belakangnya.
    Menulis stroke-width dua kali menghasilkan HTML tidak valid dan browser
    memakai yang pertama — nilai kedua diam-diam diabaikan."""
    width = '3' if 'stroke-width="3"' in extra else '2'
    rest = extra.replace(' stroke-width="3"', '')
    return (f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round" '
            f'aria-hidden="true"{rest}>{body}</svg>')

I = {
 'shield': svg('<path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3Z"/>'),
 'shieldCheck': svg('<path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3Z"/><path d="m9 12 2 2 4-4"/>'),
 'mail': svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
 'lock': svg('<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>'),
 'user': svg('<path d="M16 20v-2a4 4 0 0 0-8 0v2M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>'),
 'userPlus': svg('<path d="M16 20v-2a4 4 0 0 0-8 0v2M12 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19 8v6M22 11h-6"/>'),
 'check': svg('<path d="m5 12 5 5L20 7"/>', ' stroke-width="3"'),
 'checkThin': svg('<path d="m5 12 5 5L20 7"/>'),
 'arrow': svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
 'login': svg('<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/>'),
 'alert': svg('<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/>'),
 'info': svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
 'close': svg('<path d="M6 6l12 12M18 6 6 18"/>'),
 'eyeOpen': svg('<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/>'),
 'eyeShut': svg('<path d="m3 3 18 18M10.6 6.2A11 11 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3 3.8M6.6 6.6C3.6 8.5 2 12 2 12s3.5 6 10 6a10 10 0 0 0 3-.4"/>'),
 'clock': svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
 'hourglass': svg('<path d="M7 3h10M7 21h10M8 3v4l4 5 4-5V3M8 21v-4l4-5 4 5v4"/>'),
 'rocket': svg('<path d="M5 13c0-5 3.5-9 9-9 3 0 5 2 5 5 0 5.5-4 9-9 9-3 0-5-2-5-5Z"/><path d="m9 15-4 4M14.5 9.5h.01"/>'),
 'gear': svg('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
 'headset': svg('<path d="M12 3a9 9 0 0 0-9 9v4a2 2 0 0 0 2 2h2v-6H5a7 7 0 0 1 14 0h-2v6h2a2 2 0 0 0 2-2v-4a9 9 0 0 0-9-9Z"/>'),
 'phone': svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z"/>'),
 'bolt': svg('<path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z"/>'),
 'grid': svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
 'chart': svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v5h-5"/>'),
 'puzzle': svg('<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><rect x="3" y="3" width="18" height="18" rx="3"/>'),
 'search': svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
 'globe': svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 6.5 3.5 9s-1 6.5-3.5 9c-2.5-3.5-3.5-6.5-3.5-9S9.5 6.5 12 3Z"/>'),
 'sun': svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
 'moon': svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/>'),
 'burger': svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
 'google': svg('<path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.1 2.7-7.1Z"/><path d="M12 21c2.5 0 4.6-.8 6.2-2.3l-3.1-2.4c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H3.7v2.4A9 9 0 0 0 12 21Z"/><path d="M6.9 13.4a5.4 5.4 0 0 1 0-3.4V7.6H3.7a9 9 0 0 0 0 8.1l3.2-2.3Z"/><path d="M12 6.6c1.3 0 2.5.5 3.5 1.4l2.6-2.6A9 9 0 0 0 3.7 7.6l3.2 2.4C7.6 8.2 9.6 6.6 12 6.6Z"/>'),
 'microsoft': svg('<rect x="3" y="3" width="8" height="8"/><rect x="13" y="3" width="8" height="8"/><rect x="3" y="13" width="8" height="8"/><rect x="13" y="13" width="8" height="8"/>'),
 'github': svg('<path d="M9 19c-4 1.4-4-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.3 4.3 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.3 4.3 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"/>'),
 'linkedin': svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7h.01M12 17v-4a2 2 0 0 1 4 0v4"/>'),
 'twitter': svg('<path d="M21 5.5a8 8 0 0 1-2.3.7 4 4 0 0 0 1.8-2.2 8 8 0 0 1-2.6 1A4 4 0 0 0 11 8.6 11.4 11.4 0 0 1 3 4.6a4 4 0 0 0 1.2 5.3A4 4 0 0 1 2.4 9v.1a4 4 0 0 0 3.2 3.9 4 4 0 0 1-1.8.1 4 4 0 0 0 3.7 2.8A8 8 0 0 1 2 17.6 11.3 11.3 0 0 0 8.1 19c7 0 11-6 11-11v-.5A7.7 7.7 0 0 0 21 5.5Z"/>'),
 'star': svg('<path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.9L12 17.8 5.9 21l1.2-6.9-5-4.9 6.9-1L12 2Z"/>').replace('fill="none"', 'fill="currentColor"'),
 'sparkle': svg('<path d="M12 2l1.9 5.6L19.5 9l-4.4 3.6 1.3 5.7L12 15.4 7.6 18.3l1.3-5.7L4.5 9l5.6-1.4L12 2Z"/>').replace('fill="none"', 'fill="currentColor"'),
}


# Lambang merek pihak ketiga — berwarna, memakai `fill` bukan `stroke`, jadi
# tidak lewat helper svg() yang monokrom. Warna resmi masing-masing merek.
BRAND_GOOGLE = (
    '<svg viewBox="0 0 24 24" aria-hidden="true" class="shrink-0">'
    '<path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.44c-.28 1.48-1.12 2.73-2.38 3.58v2.97h3.86c2.26-2.09 3.57-5.17 3.57-8.79Z"/>'
    '<path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-2.97c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z"/>'
    '<path fill="#FBBC05" d="M5.27 14.32a7.2 7.2 0 0 1 0-4.64V6.59H1.29a12 12 0 0 0 0 10.82l3.98-3.09Z"/>'
    '<path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.59l3.98 3.09C6.22 6.83 8.87 4.75 12 4.75Z"/>'
    '</svg>')
BRAND_MICROSOFT = (
    '<svg viewBox="0 0 24 24" aria-hidden="true" class="shrink-0">'
    '<path fill="#F25022" d="M1 1h10.2v10.2H1z"/>'
    '<path fill="#7FBA00" d="M12.8 1H23v10.2H12.8z"/>'
    '<path fill="#00A4EF" d="M1 12.8h10.2V23H1z"/>'
    '<path fill="#FFB900" d="M12.8 12.8H23V23H12.8z"/>'
    '</svg>')

# --------------------------------------------------------------------------- #
# Shell: navbar, strip fitur, footer — ditulis sekali
# --------------------------------------------------------------------------- #
# Urutan mengikuti referensi auth_page_1..3. "Fitur" bertingkat (punya submenu),
# sisanya tautan datar.
NAV_ITEMS = [('#fitur', 'landing.nav.features', 'Fitur', True),
             (f'{HOME}#komponen', 'landing.nav.components', 'Komponen', False),
             (f'{HOME}#pricing', 'auth.footer.pricing', 'Harga', False),
             (f'{ADMIN}/index.html', 'auth.nav.docs', 'Dokumentasi', False),
             ('#kontak', 'auth.footer.blog', 'Blog', False),
             ('#kontak', 'landing.nav.contact', 'Kontak', False)]

# Submenu "Fitur" — tingkat kedua navigasi.
NAV_SUB = [(f'{ADMIN}/dashboard.html', 'landing.nav.dashboard', 'Dashboard'),
           (f'{ADMIN}/table-components.html', 'auth.sub.tables', 'Tabel Data'),
           (f'{ADMIN}/foundation.html', 'auth.sub.tokens', 'Design Token'),
           ('./register.html', 'auth.sub.auth', 'Autentikasi')]

def navbar():
    sub = '\n'.join(
        f'          <a class="dropdown-item" href="{h}" data-i18n="{k}" role="menuitem">{lbl}</a>'
        for h, k, lbl in NAV_SUB)
    def one(h, k, lbl, tiered):
        if not tiered:
            return f'      <a href="{h}" data-i18n="{k}">{lbl}</a>'
        # Tautan bertingkat: tetap bisa diklik, chevron menandai ada submenu.
        # Label WAJIB dibungkus <span>: data-i18n mengganti textContent elemen
        # yang dipasanginya, jadi kalau dipasang di <a> maka chevron SVG di
        # dalamnya ikut terhapus begitu kamus diterapkan.
        return (f'      <span class="landing-nav-group" data-dropdown>\n'
                f'        <a href="{h}" data-dropdown-toggle aria-expanded="false" aria-haspopup="true">'
                f'<span data-i18n="{k}">{lbl}</span>'
                f'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" '
                f'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></a>\n'
                f'        <span class="dropdown-panel w-56" data-dropdown-panel role="menu">\n{sub}\n        </span>\n'
                f'      </span>')
    links = '\n'.join(one(*item) for item in NAV_ITEMS)
    mob_sub = '\n'.join(
        f'        <a class="landing-mobile-sub" href="{h}" data-i18n="{k}">{lbl}</a>' for h, k, lbl in NAV_SUB)
    mob = '\n'.join(
        (f'        <a href="{h}" data-i18n="{k}">{lbl}</a>' + ('\n' + mob_sub if tiered else ''))
        for h, k, lbl, tiered in NAV_ITEMS)
    return f'''<header class="landing-topbar auth-reveal auth-reveal--down" data-landing-topbar data-auth-reveal data-auth-delay="0">
  <div class="landing-topbar-inner">
    <a class="landing-brand" href="./index.html">
      <img src="./assets/images/brand/pa-dev-logo.png" alt="Logo PA DEV" width="47" height="36">
      <span>PA DEV</span>
    </a>

    <nav class="landing-nav" data-landing-nav aria-label="Navigasi halaman">
{links}
    </nav>

    <div class="landing-topbar-actions">
      <span class="landing-nav-group landing-switcher" data-dropdown>
        <button type="button" class="landing-icon-btn" data-dropdown-toggle aria-expanded="false" aria-haspopup="true" aria-label="Pindah produk" data-i18n-aria-label="suite.switch">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
        </button>
        <span class="dropdown-panel w-60" data-dropdown-panel role="menu" aria-label="Produk PA DEV" data-i18n-aria-label="suite.menu">
          <span class="landing-switcher-head" data-i18n="suite.title">PA DEV Suite</span>
          <a class="dropdown-item" href="{SUITE_FRONTPAGE}/" role="menuitem" data-suite="frontpage"><span data-i18n="suite.landing">Landing Page</span></a>
          <a class="dropdown-item" href="{SUITE_AUTH}/" role="menuitem" data-suite="auth"><span data-i18n="suite.auth">Autentikasi</span></a>
          <a class="dropdown-item" href="{SUITE_ADMIN}/" role="menuitem" data-suite="admin"><span data-i18n="suite.admin">Admin Theme</span></a>
        </span>
      </span>
      <button type="button" class="landing-icon-btn" data-theme-toggle aria-pressed="false" aria-label="Ganti mode terang atau gelap" data-i18n-aria-label="landing.nav.theme">
        <svg data-theme-icon="light" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
        <svg data-theme-icon="dark" class="hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
      </button>

      <div class="relative" data-dropdown>
        <button type="button" class="landing-icon-btn" data-dropdown-toggle aria-expanded="false" aria-haspopup="true" aria-label="Ganti bahasa" data-i18n-aria-label="landing.nav.language">
          {I['globe']}
        </button>
        <div class="dropdown-panel w-52" data-dropdown-panel role="menu" aria-label="Pilih bahasa" data-i18n-aria-label="landing.nav.languageMenu">
          <button type="button" class="dropdown-item" role="menuitemradio" aria-checked="false" data-locale-choice="en">English</button>
          <button type="button" class="dropdown-item" role="menuitemradio" aria-checked="false" data-locale-choice="id">Bahasa Indonesia</button>
          <button type="button" class="dropdown-item" role="menuitemradio" aria-checked="false" data-locale-choice="ms">Bahasa Melayu</button>
        </div>
      </div>

      <a href="./index.html" class="landing-link-quiet" data-i18n="auth.action.signin">Masuk</a>
      <a href="./register.html" class="landing-btn landing-btn--primary hidden sm:inline-flex" data-i18n="auth.action.start">Mulai Gratis</a>

      <button type="button" class="landing-burger" data-landing-burger aria-expanded="false" aria-controls="menu-mobile" aria-label="Buka menu" data-i18n-aria-label="landing.nav.menu">
        {I['burger']}
      </button>
    </div>
  </div>

  <div class="landing-mobile-panel" id="menu-mobile" data-landing-mobile>
    <div>
      <nav class="landing-mobile-nav" data-landing-nav aria-label="Navigasi halaman (mobile)">
{mob}
        <a href="./register.html" class="landing-btn landing-btn--primary" data-i18n="auth.action.start">Mulai Gratis</a>
      </nav>
    </div>
  </div>
</header>'''


FEATURES = [
    ('bolt',   'auth.feat.perfTitle', 'Performa Tinggi',   'auth.feat.perfBody', 'Infrastruktur modern untuk performa optimal.'),
    ('lock',   'auth.feat.secTitle',  'Keamanan Terjamin', 'auth.feat.secBody',  'Standar keamanan industri dan enkripsi menyeluruh.'),
    ('puzzle', 'auth.feat.intTitle',  'Mudah Diintegrasikan', 'auth.feat.intBody', 'API dan dokumentasi lengkap dengan SDK siap pakai.'),
    ('chart',  'auth.feat.scaTitle',  'Skalabel & Fleksibel', 'auth.feat.scaBody', 'Tumbuh bersama aplikasi Anda tanpa batas.'),
]

def feature_strip():
    cards = '\n'.join(f'''      <article class="landing-card auth-reveal" data-auth-reveal data-auth-seq="{i}">
        <span class="landing-card-icon">{I[icon]}</span>
        <h3 data-i18n="{tk}">{tv}</h3>
        <p data-i18n="{bk}">{bv}</p>
      </article>''' for i, (icon, tk, tv, bk, bv) in enumerate(FEATURES))
    return f'''  <section class="landing-section landing-section--tint" id="fitur">
    <div class="landing-container">
      <div class="landing-grid lg:grid-cols-4" data-auth-stagger="80">
{cards}
      </div>
    </div>
  </section>'''


FOOTER_COLS = [
    ('auth.footer.product', 'Produk', [('#fitur', 'landing.nav.features', 'Fitur'),
                                       (f'{HOME}#pricing', 'auth.footer.pricing', 'Harga'),
                                       (f'{HOME}#komponen', 'landing.nav.components', 'Komponen'),
                                       (f'{ADMIN}/index.html#changelog', 'auth.footer.changelog', 'Changelog')]),
    ('auth.footer.resource', 'Sumber Daya', [(f'{ADMIN}/index.html', 'auth.nav.docs', 'Dokumentasi'),
                                             ('#kontak', 'auth.footer.blog', 'Blog'),
                                             ('./maintenance.html', 'auth.footer.status', 'Status'),
                                             (f'{ADMIN}/foundation.html', 'auth.footer.api', 'API Reference')]),
    ('auth.footer.company', 'Perusahaan', [('#fitur', 'auth.footer.about', 'Tentang Kami'),
                                           ('#kontak', 'auth.footer.career', 'Karier'),
                                           ('#kontak', 'landing.nav.contact', 'Kontak'),
                                           ('#kontak', 'auth.footer.privacy', 'Kebijakan Privasi')]),
]

def footer():
    cols = '\n'.join(f'''      <div class="landing-footer-col">
        <h4 data-i18n="{hk}">{hv}</h4>
        <ul>
{chr(10).join(f'          <li><a href="{h}" data-i18n="{k}">{lbl}</a></li>' for h, k, lbl in items)}
        </ul>
      </div>''' for hk, hv, items in FOOTER_COLS)
    social = '\n'.join(
        f'        <a href="#kontak" aria-label="{name}">{I[icon]}</a>'
        for name, icon in [('GitHub', 'github'), ('LinkedIn', 'linkedin'), ('Twitter', 'twitter'), ('Email', 'mail')])
    return f'''<footer class="landing-footer auth-reveal" id="kontak" data-auth-reveal>
  <div class="landing-container">
    <div class="landing-footer-grid">
      <div class="landing-footer-about">
        <a class="landing-brand" href="./index.html"><img src="./assets/images/brand/pa-dev-logo.png" alt="Logo PA DEV" width="47" height="36"><span>PA DEV</span></a>
        <p data-i18n="auth.footer.about">Platform backend modern untuk membangun, mengelola, dan menskalakan aplikasi dengan lebih cepat dan aman.</p>
      </div>

{cols}

      <div class="landing-footer-col">
        <h4 data-i18n="auth.footer.stay">Tetap Terhubung</h4>
        <p class="landing-newsletter-note" data-i18n="auth.footer.stayNote">Dapatkan update terbaru, tips, dan informasi produk langsung ke email Anda.</p>
        <form class="landing-newsletter" data-newsletter novalidate>
          <label class="sr-only" for="news-email" data-i18n="auth.footer.newsLabel">Alamat email</label>
          <input id="news-email" type="email" name="email" placeholder="nama@domain.com" data-i18n-placeholder="auth.ph.email" autocomplete="email" required>
          <button type="submit" class="landing-btn landing-btn--primary" aria-label="Berlangganan" data-i18n-aria-label="auth.footer.subscribe">{I['arrow']}</button>
          <p class="sr-only" data-newsletter-note role="status"></p>
        </form>
      </div>
    </div>

    <div class="landing-footer-bottom">
      <p>© <span data-landing-year>2026</span> PA DEV. <span data-i18n="auth.footer.rights">Semua hak dilindungi.</span></p>
      <div class="landing-footer-legal">
        <a href="#kontak" data-i18n="auth.footer.terms">Syarat &amp; Ketentuan</a>
        <a href="#kontak" data-i18n="auth.footer.privacy">Kebijakan Privasi</a>
        <a href="#kontak" data-i18n="auth.footer.cookie">Kebijakan Cookie</a>
      </div>
      <div class="landing-social">
{social}
      </div>
    </div>
  </div>
</footer>'''


PAGE_LINKS = [
    ('index.html', 'auth.page.login', 'Login'), ('register.html', 'auth.page.register', 'Register'),
    ('forgot-password.html', 'auth.page.forgot', 'Lupa Password'), ('check-email.html', 'auth.page.check', 'Cek Email'),
    ('reset-password.html', 'auth.page.reset', 'Reset Password'), ('reset-success.html', 'auth.page.done', 'Berhasil'),
    ('error-401.html', 'auth.page.e401', '401'), ('error-403.html', 'auth.page.e403', '403'),
    ('error-404.html', 'auth.page.e404', '404'), ('error-419.html', 'auth.page.e419', '419'),
    ('error-429.html', 'auth.page.e429', '429'), ('error-500.html', 'auth.page.e500', '500'),
    ('coming-soon.html', 'auth.page.soon', 'Coming Soon'), ('maintenance.html', 'auth.page.maint', 'Maintenance'),
    ('pending-approval.html', 'auth.page.pending', 'Pending Approval'),
]

def page_index():
    links = '\n'.join(
        f'        <a class="auth-page-chip" href="./{h}" data-i18n="{k}">{lbl}</a>' for h, k, lbl in PAGE_LINKS)
    return f'''  <section class="landing-section py-10">
    <div class="landing-container">
      <p class="mb-4 text-center font-ui text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted" data-i18n="auth.demoPages">Semua halaman demo</p>
      <nav class="auth-page-chips" aria-label="Halaman demo auth">
{links}
      </nav>
    </div>
  </section>'''


def page(slug, title, body, extra_head=''):
    return f'''<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="PA DEV Auth — {title}">
  <title>{title} — PA DEV Auth</title>
  <link rel="icon" href="./assets/images/brand/pa-dev-logo.png" type="image/png">
  <link rel="stylesheet" href="./assets/css/app.css">
  <script src="./assets/js/theme-init.js"></script>{extra_head}
</head>
<!--
  DIHASILKAN dari scripts pembangun halaman auth. Shell (navbar, strip fitur,
  footer) berasal dari satu sumber supaya 15 halaman tidak saling melenceng.

  CATATAN TAUTAN LINTAS PRODUK
  ./admin/ menunjuk PA DEV Admin, ../ menunjuk PA DEV Frontpage. Asumsinya
  ketiganya disajikan dari root yang sama. Kalau berbeda, cukup cari-ganti
  prefiksnya di berkas pembangun.
-->
<body class="auth-page landing-page" data-auth>

{navbar()}

<main>
{body}

{feature_strip()}

{page_index()}
</main>

{footer()}

<script src="./assets/js/auth.js" defer></script>
<script src="./assets/js/i18n.js" defer></script>
<script src="./assets/js/pages-auth-i18n.js" defer></script>
<script src="./assets/js/app.js" defer></script>
</body>
</html>
'''

# --------------------------------------------------------------------------- #
# Potongan yang dipakai berulang
# --------------------------------------------------------------------------- #
def field(fid, label_key, label, ph_key, ph, icon='mail', typ='email', autocomplete='email',
          required=True, seq=0, password=False, attrs=''):
    eye = ''
    wrap_attr = ''
    if password:
        wrap_attr = ' data-auth-password'
        eye = (f'<button type="button" class="auth-eye" aria-pressed="false" aria-label="Tampilkan kata sandi" '
               f'data-i18n-aria-label="auth.showPassword">'
               f'{I["eyeOpen"].replace("<svg", "<svg data-eye=\'open\'")}'
               f'{I["eyeShut"].replace("<svg", "<svg data-eye=\'shut\' class=\'hidden\'")}</button>')
    req = ' required' if required else ''
    return f'''        <div class="auth-field auth-reveal" data-auth-reveal data-auth-seq="{seq}">
          <label class="auth-label" for="{fid}" data-i18n="{label_key}">{label}</label>
          <div class="auth-control"{wrap_attr}>{I[icon]}
            <input class="auth-input" id="{fid}" name="{fid}" type="{typ}" placeholder="{ph}" data-i18n-placeholder="{ph_key}" autocomplete="{autocomplete}" aria-invalid="false"{req}{attrs}>
            {eye}
          </div>
          <p class="auth-error" data-auth-error role="alert"></p>
        </div>'''


def social_block(key='auth.orContinue', text='atau lanjutkan dengan'):
    return f'''        <p class="auth-divider"><span data-i18n="{key}">{text}</span></p>
        <div class="auth-social">
          <a class="auth-social-btn" href="#kontak">{BRAND_GOOGLE}<span>Google</span></a>
          <a class="auth-social-btn" href="#kontak">{BRAND_MICROSOFT}<span>Microsoft</span></a>
        </div>'''


def privacy_note():
    return f'''        <p class="auth-note">{I['shieldCheck']}<span data-i18n="auth.privacyNote">Kami tidak akan pernah membagikan data Anda ke pihak ketiga. Seluruh data dienkripsi dan aman bersama kami.</span></p>'''


TRUST = [('user', '25K+', 'auth.trust.dev', 'Developer Aktif'),
         ('checkThin', '99.9%', 'auth.trust.sla', 'SLA Uptime Terjamin'),
         ('shield', 'ISO 27001', 'auth.trust.iso', 'Sertifikasi Keamanan'),
         ('lock', 'E2E', 'auth.trust.enc', 'Enkripsi Data Aman'),
         ('star', '4.9/5', 'auth.trust.rating', 'Rating Pengguna')]

def trust_row():
    items = '\n'.join(f'''        <div class="landing-trust-item">
          <span class="landing-trust-icon">{I[icon]}</span>
          <span><strong>{val}</strong><span data-i18n="{k}">{lbl}</span></span>
        </div>''' for icon, val, k, lbl in TRUST)
    return f'''      <div class="landing-trust lg:grid-cols-3 auth-reveal" data-auth-reveal data-auth-delay="400">
{items}
      </div>'''


def mockup_illustration():
    """Ilustrasi kolom kiri memakai potret dashboard PA DEV yang SEBENARNYA
    (terang & gelap), sama seperti hero landing — bukan gambar karangan."""
    return f'''        <div class="auth-illus auth-reveal auth-reveal--scale" data-auth-reveal>
          <div class="landing-mockup w-full">
            <img data-appearance="light" src="./assets/images/preview/dashboard-light.png" alt="Pratinjau dashboard PA DEV" data-i18n-alt="auth.mockupAlt" width="1440" height="900" loading="lazy">
            <img data-appearance="dark" src="./assets/images/preview/dashboard-dark.png" alt="Pratinjau dashboard PA DEV mode gelap" data-i18n-alt="auth.mockupAlt" width="1440" height="900" loading="lazy">
          </div>
          <span class="auth-ornament auth-ornament--a">{I['bolt']}</span>
          <span class="auth-ornament auth-ornament--b">{I['shield']}</span>
          <span class="auth-ornament auth-ornament--c">{I['chart']}</span>
        </div>'''


def screen_illustration(inner, orn=('bolt', 'shield', 'chart')):
    """Bingkai layar berisi `inner` (kode error atau ikon), dikelilingi ornamen.

    Menggantikan kotak kosong sebelumnya. Semua dari token & elemen yang sudah
    ada — tidak ada aset gambar pihak ketiga yang perlu dilisensikan ulang saat
    template ini dijual.
    """
    a, b, c = orn
    return f'''        <div class="auth-illus auth-reveal auth-reveal--scale" data-auth-reveal>
          <div class="auth-illus-screen">
            <span class="auth-illus-bar" aria-hidden="true"><i></i><i></i><i></i></span>
            <div class="auth-illus-body">
              {inner}
              <span class="auth-illus-lines" aria-hidden="true"><span></span><span></span></span>
            </div>
          </div>
          <span class="auth-ornament auth-ornament--a">{I[a]}</span>
          <span class="auth-ornament auth-ornament--b">{I[b]}</span>
          <span class="auth-ornament auth-ornament--c">{I[c]}</span>
        </div>'''


def illustration(inner, size='h-44 w-64'):
    return f'''        <div class="auth-illus auth-reveal auth-reveal--scale" data-auth-reveal>
          <div class="auth-illus-shape {size}">{inner}</div>
          <span class="auth-ornament auth-ornament--a">{I['bolt']}</span>
          <span class="auth-ornament auth-ornament--b">{I['shield']}</span>
          <span class="auth-ornament auth-ornament--c">{I['chart']}</span>
        </div>'''


# --------------------------------------------------------------------------- #
# 1. LOGIN  (index.html)
# --------------------------------------------------------------------------- #
BENEFITS = [('auth.ben.readyTitle', 'API siap pakai & mudah diintegrasi', 'auth.ben.readyBody', 'Dokumentasi lengkap dan SDK untuk bahasa populer.'),
            ('auth.ben.secTitle', 'Autentikasi aman & terstandar', 'auth.ben.secBody', 'Role-based access, audit log, dan enkripsi menyeluruh.'),
            ('auth.ben.monTitle', 'Monitoring realtime & analytics', 'auth.ben.monBody', 'Pantau performa dan anomali tanpa alat tambahan.'),
            ('auth.ben.scaTitle', 'Skalabel & siap production', 'auth.ben.scaBody', 'Tumbuh dari purwarupa sampai beban produksi nyata.')]

def benefits():
    items = '\n'.join(f'''          <li><span class="auth-benefit-check">{I['check']}</span>
            <span><strong data-i18n="{tk}">{tv}</strong><span data-i18n="{bk}">{bv}</span></span></li>''' for tk, tv, bk, bv in BENEFITS)
    return f'''        <ul class="auth-benefits auth-reveal" data-auth-reveal data-auth-delay="320">
{items}
        </ul>'''


login_body = f'''  <section class="auth-hero">
    <div class="landing-container">
      <div class="auth-grid">

        <div>
          <p class="landing-badge auth-reveal" data-auth-reveal data-auth-delay="80">{I['shieldCheck']}<span data-i18n="auth.login.badge">Backend Modern &amp; Terpercaya</span></p>
          <h1 class="auth-narrative-title auth-reveal" data-auth-reveal data-auth-delay="160">
            <span data-i18n="auth.login.title1">Selamat Datang Kembali!</span><br>
            <span data-i18n="auth.login.title2">Kelola</span> <em data-i18n="auth.login.em1">Backend</em> <span data-i18n="auth.login.title3">Anda Lebih</span> <em data-i18n="auth.login.em2">Cepat</em>
          </h1>
          <p class="auth-narrative-lead auth-reveal" data-auth-reveal data-auth-delay="240" data-i18n="auth.login.lead">Masuk ke akun Anda untuk mengelola API, data, autentikasi, dan infrastruktur backend dalam satu platform modern.</p>
{benefits()}
{trust_row()}
          <p class="mt-4 text-center font-ui text-sm text-ink-body auth-reveal" data-auth-reveal data-auth-delay="480">
            <span data-i18n="auth.trustedBy">Dipercaya 25.000+ developer di Indonesia</span>
            <span class="landing-proof-stars ml-2">{I['star']}4.9/5</span>
          </p>
        </div>

        <div class="auth-panel auth-reveal auth-reveal--scale" data-auth-reveal data-auth-delay="240">
          <span class="auth-panel-badge"><img src="./assets/images/brand/pa-dev-logo.png" alt="Logo PA DEV" width="47" height="36"></span>
          <h2 class="auth-panel-title" data-i18n="auth.login.panelTitle">Masuk ke Akun Anda</h2>
          <p class="auth-panel-lead" data-i18n="auth.login.panelLead">Silakan masuk untuk melanjutkan ke dashboard Anda.</p>

          <form class="auth-form" data-auth-form novalidate>
            <div class="auth-banner auth-banner--error hidden" data-auth-banner role="alert">
              {I['alert']}<span data-i18n="auth.login.error">Email atau password salah. Silakan coba lagi.</span>
              <button type="button" class="auth-banner-close" data-auth-banner-close aria-label="Tutup" data-i18n-aria-label="auth.close">{I['close']}</button>
            </div>
            <div class="auth-banner auth-banner--success hidden" data-auth-success role="status" tabindex="-1">
              {I['checkThin']}<span data-i18n="auth.login.success">Demo login berhasil divalidasi. Tidak ada request backend yang dikirim.</span>
            </div>

{field('login-email', 'auth.field.email', 'Email', 'auth.ph.email', 'nama@domain.com', 'mail', 'email', 'email', True, 0)}
{field('login-password', 'auth.field.password', 'Password', 'auth.ph.password', '••••••••••••', 'lock', 'password', 'current-password', True, 1, password=True)}

            <div class="auth-row auth-reveal" data-auth-reveal data-auth-seq="2">
              <label class="auth-check">
                <input type="checkbox" name="remember" checked>
                <span class="auth-check-box">{I['check']}</span>
                <span data-i18n="auth.rememberMe">Ingat saya</span>
              </label>
              <a class="auth-link" href="./forgot-password.html" data-i18n="auth.forgot">Lupa password?</a>
            </div>

            <button type="submit" class="landing-btn landing-btn--primary landing-btn--full auth-reveal" data-auth-reveal data-auth-seq="3">{I['login']}<span data-i18n="auth.action.login">Masuk</span></button>

{social_block()}
{privacy_note()}
          </form>

          <p class="auth-foot"><span data-i18n="auth.noAccount">Belum punya akun?</span> <a class="auth-link" href="./register.html" data-i18n="auth.registerNow">Daftar sekarang</a></p>
        </div>

      </div>
    </div>
  </section>'''

# --------------------------------------------------------------------------- #
# 2. REGISTER
# --------------------------------------------------------------------------- #
REG_BENEFITS = [('auth.reg.b1t', 'Cepat & Produktif', 'auth.reg.b1b', 'API siap pakai, komponen lengkap, dan dokumentasi jelas.'),
                ('auth.reg.b2t', 'Aman & Terpercaya', 'auth.reg.b2b', 'Autentikasi berlapis, role-based access, dan audit log.'),
                ('auth.reg.b3t', 'Skalabel & Fleksibel', 'auth.reg.b3b', 'Dibangun untuk tumbuh bersama produk Anda.'),
                ('auth.reg.b4t', 'Dukungan Aktif', 'auth.reg.b4b', 'Komunitas dan tim support siap membantu Anda.')]

def reg_benefits():
    items = '\n'.join(f'''          <li><span class="auth-benefit-check">{I['check']}</span>
            <span><strong data-i18n="{tk}">{tv}</strong><span data-i18n="{bk}">{bv}</span></span></li>''' for tk, tv, bk, bv in REG_BENEFITS)
    return f'''        <ul class="auth-benefits auth-reveal" data-auth-reveal>
{items}
        </ul>'''

STRENGTH_RULES = [('length', 'auth.rule.length', 'Minimal 8 karakter'),
                  ('case', 'auth.rule.case', 'Mengandung huruf besar & kecil'),
                  ('number', 'auth.rule.number', 'Mengandung angka'),
                  ('symbol', 'auth.rule.symbol', 'Mengandung simbol')]

def strength_meter(for_id):
    rules = '\n'.join(f'''            <li data-rule="{r}">{I['checkThin']}<span data-i18n="{k}">{lbl}</span></li>''' for r, k, lbl in STRENGTH_RULES)
    return f'''          <div class="auth-strength" data-auth-strength="{for_id}" data-level="0">
            <div class="auth-strength-bars" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
            <p class="auth-strength-label"><span data-i18n="auth.strengthLabel">Kekuatan sandi:</span> <strong data-strength-label>—</strong></p>
            <ul class="auth-rules">
{rules}
            </ul>
          </div>'''

NEXT_STEPS = [('mail', '1', 'auth.next.s1t', 'Verifikasi Email', 'auth.next.s1b', 'Cek inbox Anda dan klik tautan verifikasi yang kami kirimkan.'),
              ('lock', '2', 'auth.next.s2t', 'Verifikasi OTP', 'auth.next.s2b', 'Masukkan kode OTP 6 digit untuk mengamankan akun Anda.')]

register_body = f'''  <section class="auth-hero">
    <div class="landing-container">
      <div class="auth-grid">

        <div>
          <h1 class="auth-narrative-title auth-reveal" data-auth-reveal data-auth-delay="80">
            <span data-i18n="auth.reg.title1">Buat Akun PA DEV</span><br>
            <em data-i18n="auth.reg.em1">Mulai Bangun Backend Anda</em><br>
            <span data-i18n="auth.reg.title2">Lebih Cepat, Lebih Aman</span>
          </h1>
          <p class="auth-narrative-lead auth-reveal" data-auth-reveal data-auth-delay="160" data-i18n="auth.reg.lead">Daftar gratis dan dapatkan akses ke semua fitur unggulan untuk membangun, mengelola, dan menskalakan backend modern.</p>
{reg_benefits()}
{illustration(f'{I["userPlus"]}'.replace('<svg', '<svg class="h-16 w-16" style="color: rgb(var(--primary-600))"'))}
          <p class="auth-note auth-reveal" data-auth-reveal>{I['sparkle']}<span><strong data-i18n="auth.reg.freeTitle">Gratis untuk Memulai</strong> — <span data-i18n="auth.reg.freeBody">tidak perlu kartu kredit.</span></span></p>
        </div>

        <div class="auth-panel auth-reveal auth-reveal--scale" data-auth-reveal data-auth-delay="240">
          <h2 class="auth-panel-title" data-i18n="auth.reg.panelTitle">Daftar Akun Baru</h2>
          <p class="auth-panel-lead" data-i18n="auth.reg.panelLead">Isi data di bawah untuk membuat akun PA DEV Anda.</p>

          <form class="auth-form" data-auth-form novalidate>
            <div class="auth-banner auth-banner--success hidden" data-auth-success role="status" tabindex="-1">
              {I['checkThin']}<span data-i18n="auth.reg.success">Demo pendaftaran berhasil divalidasi. Tidak ada data yang dikirim.</span>
            </div>

{field('reg-name', 'auth.field.name', 'Nama Lengkap', 'auth.ph.name', 'Contoh: Andi Pratama', 'user', 'text', 'name', True, 0)}
{field('reg-email', 'auth.field.email', 'Email', 'auth.ph.email', 'nama@domain.com', 'mail', 'email', 'email', True, 1)}
{field('reg-password', 'auth.field.pass', 'Kata Sandi', 'auth.ph.password', '••••••••••••', 'lock', 'password', 'new-password', True, 2, password=True, attrs=' minlength="8" data-password-main')}
{strength_meter('reg-password')}
{field('reg-confirm', 'auth.field.confirm', 'Konfirmasi Kata Sandi', 'auth.ph.password', '••••••••••••', 'lock', 'password', 'new-password', True, 3, password=True, attrs=' data-password-confirm')}

            <label class="auth-check auth-reveal" data-auth-reveal data-auth-seq="4">
              <input type="checkbox" name="terms" required checked>
              <span class="auth-check-box">{I['check']}</span>
              <span><span data-i18n="auth.reg.agree">Saya menyetujui</span> <a class="auth-link" href="#kontak" data-i18n="auth.footer.terms">Syarat &amp; Ketentuan</a> <span data-i18n="auth.reg.and">dan</span> <a class="auth-link" href="#kontak" data-i18n="auth.footer.privacy">Kebijakan Privasi</a></span>
            </label>

            <button type="submit" class="landing-btn landing-btn--primary landing-btn--full auth-reveal" data-auth-reveal data-auth-seq="5">{I['userPlus']}<span data-i18n="auth.action.register">Daftar Sekarang</span></button>

{social_block('auth.orRegister', 'atau daftar dengan')}
          </form>

          <p class="auth-foot"><span data-i18n="auth.hasAccount">Sudah punya akun?</span> <a class="auth-link" href="./index.html" data-i18n="auth.signinHere">Masuk di sini</a></p>
        </div>

      </div>
    </div>
  </section>

  <section class="landing-section pt-0">
    <div class="landing-container">
      <div class="auth-panel auth-reveal" data-auth-reveal>
        <h2 class="font-display text-lg font-semibold text-ink-heading" data-i18n="auth.next.title">Langkah Selanjutnya Setelah Daftar</h2>
        <p class="mt-1 font-ui text-sm text-ink-body" data-i18n="auth.next.lead">Verifikasi akun Anda untuk mulai menggunakan PA DEV.</p>
        <div class="mt-6 grid gap-4 sm:grid-cols-2" data-auth-stagger="80">
{chr(10).join(f'''          <article class="auth-step-card auth-reveal" data-auth-reveal data-auth-seq="{i}">
            <div class="auth-step-head"><span class="auth-step-no">{no}</span><span data-i18n="{tk}">{tv}</span></div>
            <span class="landing-card-icon">{I[icon]}</span>
            <p class="mt-2 font-ui text-sm leading-6 text-ink-body" data-i18n="{bk}">{bv}</p>
          </article>''' for i, (icon, no, tk, tv, bk, bv) in enumerate(NEXT_STEPS))}
        </div>
      </div>
    </div>
  </section>'''

# --------------------------------------------------------------------------- #
# 3. ALUR RESET — 4 halaman
# --------------------------------------------------------------------------- #
FLOW = [('auth.flow.s1', 'Lupa Password', 'auth.flow.s1b', 'Masukkan email Anda'),
        ('auth.flow.s2', 'Cek Email', 'auth.flow.s2b', 'Buka inbox Anda'),
        ('auth.flow.s3', 'Reset Password', 'auth.flow.s3b', 'Buat password baru'),
        ('auth.flow.s4', 'Berhasil', 'auth.flow.s4b', 'Kembali ke login')]

def flow_strip(active):
    parts = []
    for i, (tk, tv, bk, bv) in enumerate(FLOW):
        cls = ' is-active' if i <= active else ''
        parts.append(f'''        <div class="auth-flow-item{cls}">
          <span class="auth-flow-no">{i+1}</span>
          <span><strong data-i18n="{tk}">{tv}</strong><span data-i18n="{bk}">{bv}</span></span>
        </div>''')
        if i < len(FLOW) - 1:
            parts.append('        <span class="auth-flow-sep" aria-hidden="true"></span>')
    return f'''      <div class="auth-flow auth-reveal" data-auth-reveal>
{chr(10).join(parts)}
      </div>'''


RESET_TRUST = [('shieldCheck', 'auth.reset.t1t', 'Aman & Terverifikasi', 'auth.reset.t1b', 'Kami akan mengirim tautan reset melalui email terverifikasi Anda.'),
               ('clock', 'auth.reset.t2t', 'Tautan Berlaku Terbatas', 'auth.reset.t2b', 'Tautan reset hanya berlaku selama 15 menit demi keamanan akun.'),
               ('lock', 'auth.reset.t3t', 'Enkripsi & Privasi', 'auth.reset.t3b', 'Seluruh proses dienkripsi end-to-end. Data Anda selalu kami lindungi.')]

def reset_sidebar():
    items = '\n'.join(f'''        <li><span class="landing-card-icon">{I[icon]}</span>
          <span><strong data-i18n="{tk}">{tv}</strong><span data-i18n="{bk}">{bv}</span></span></li>''' for icon, tk, tv, bk, bv in RESET_TRUST)
    return f'''      <div>
        <h1 class="auth-narrative-title auth-reveal" data-auth-reveal data-auth-delay="80">
          <span data-i18n="auth.reset.title1">Lupa Password?</span><br>
          <em data-i18n="auth.reset.em1">Kami Siap Membantu Anda</em>
        </h1>
        <p class="auth-narrative-lead auth-reveal" data-auth-reveal data-auth-delay="160" data-i18n="auth.reset.lead">Ikuti langkah-langkah berikut untuk mereset password akun Anda dan kembali mengakses dashboard dengan aman.</p>
        <ul class="auth-benefits auth-reveal" data-auth-reveal>
{items}
        </ul>
        <div class="auth-note mt-6 auth-reveal" data-auth-reveal>{I['headset']}
          <span><strong data-i18n="auth.reset.helpTitle">Butuh Bantuan?</strong><br><span data-i18n="auth.reset.helpBody">Hubungi tim support kami jika Anda mengalami kendala saat mereset password.</span></span>
        </div>
        <a class="landing-btn landing-btn--ghost mt-4 auth-reveal" href="#kontak" data-auth-reveal>{I['headset']}<span data-i18n="auth.reset.contactSupport">Hubungi Support</span></a>
      </div>'''


def reset_page_body(step, panel):
    return f'''  <section class="auth-hero">
    <div class="landing-container">
{flow_strip(step)}
      <div class="auth-grid auth-grid--wide">
{reset_sidebar()}
        <div class="auth-panel auth-reveal auth-reveal--scale" data-auth-reveal data-auth-delay="240">
{panel}
        </div>
      </div>
    </div>
  </section>'''


forgot_panel = f'''          <span class="auth-panel-badge">{I['mail']}</span>
          <h2 class="auth-panel-title" data-i18n="auth.forgot.title">Lupa Password</h2>
          <p class="auth-panel-lead" data-i18n="auth.forgot.lead">Masukkan email akun Anda untuk menerima tautan reset password.</p>
          <form class="auth-form" data-auth-form novalidate>
            <div class="auth-banner auth-banner--success hidden" data-auth-success role="status" tabindex="-1">
              {I['checkThin']}<span data-i18n="auth.forgot.success">Demo: tautan reset dianggap terkirim. Tidak ada email yang benar-benar dikirim.</span>
            </div>
{field('forgot-email', 'auth.field.email', 'Email', 'auth.ph.email', 'nama@domain.com', 'mail', 'email', 'email', True, 0)}
            <button type="submit" class="landing-btn landing-btn--primary landing-btn--full auth-reveal" data-auth-reveal data-auth-seq="1">{I['arrow']}<span data-i18n="auth.forgot.send">Kirim Tautan Reset</span></button>
          </form>
          <p class="auth-foot"><a class="auth-link" href="./index.html" data-i18n="auth.backToLogin">Kembali ke Login</a></p>
          <p class="auth-note mt-5">{I['info']}<span><span data-i18n="auth.noAccount">Belum punya akun?</span> <a class="auth-link" href="./register.html" data-i18n="auth.registerNow">Daftar sekarang</a></span></p>'''

check_panel = f'''          <div class="auth-illus"><div class="auth-illus-shape h-32 w-40">{I['mail'].replace('<svg', '<svg class="h-14 w-14" style="color: rgb(var(--primary-600))"')}</div></div>
          <h2 class="auth-panel-title" data-i18n="auth.check.title">Email Terkirim!</h2>
          <p class="auth-panel-lead" data-i18n="auth.check.lead">Kami telah mengirim tautan reset password ke email Anda.</p>
          <div class="auth-form">
            <div class="auth-field">
              <div class="auth-control">{I['checkThin']}
                <input class="auth-input" type="email" value="nama@domain.com" readonly aria-label="Email tujuan" data-i18n-aria-label="auth.check.target">
              </div>
            </div>
            <p class="auth-note">{I['info']}<span data-i18n="auth.check.note">Tautan berlaku selama 15 menit. Periksa folder Spam jika tidak ditemukan.</span></p>
            <a class="landing-btn landing-btn--primary landing-btn--full" href="#kontak">{I['mail']}<span data-i18n="auth.check.open">Buka Email Saya</span></a>
            <button type="button" class="landing-btn landing-btn--ghost landing-btn--full" data-auth-resend="45" data-resend-label="Kirim Ulang" data-i18n="auth.check.resend">Kirim Ulang</button>
          </div>
          <p class="auth-foot"><a class="auth-link" href="./index.html" data-i18n="auth.backToLogin">Kembali ke Login</a></p>'''

reset_panel = f'''          <span class="auth-panel-badge">{I['lock']}</span>
          <h2 class="auth-panel-title" data-i18n="auth.newpass.title">Buat Password Baru</h2>
          <p class="auth-panel-lead" data-i18n="auth.newpass.lead">Buat password baru yang kuat dan mudah Anda ingat.</p>
          <form class="auth-form" data-auth-form novalidate>
            <div class="auth-banner auth-banner--success hidden" data-auth-success role="status" tabindex="-1">
              {I['checkThin']}<span data-i18n="auth.newpass.success">Demo: password dianggap berhasil direset.</span>
            </div>
{field('new-password', 'auth.field.newpass', 'Password Baru', 'auth.ph.password', '••••••••••••', 'lock', 'password', 'new-password', True, 0, password=True, attrs=' minlength="8" data-password-main')}
{strength_meter('new-password')}
{field('new-confirm', 'auth.field.confirmpass', 'Konfirmasi Password', 'auth.ph.password', '••••••••••••', 'lock', 'password', 'new-password', True, 1, password=True, attrs=' data-password-confirm')}
            <button type="submit" class="landing-btn landing-btn--primary landing-btn--full auth-reveal" data-auth-reveal data-auth-seq="2">{I['checkThin']}<span data-i18n="auth.newpass.submit">Reset Password</span></button>
          </form>
          <p class="auth-foot"><a class="auth-link" href="./index.html" data-i18n="auth.backToLogin">Kembali ke Login</a></p>'''

done_panel = f'''          <div class="auth-illus"><div class="auth-illus-shape auth-pulse h-32 w-32 rounded-pa-full" style="background-color: color-mix(in srgb, var(--color-success) 14%, var(--color-surface)); border-color: color-mix(in srgb, var(--color-success) 34%, transparent)">{I['check'].replace('<svg', '<svg class="h-14 w-14" style="color: var(--color-success)"')}</div></div>
          <h2 class="auth-panel-title" data-i18n="auth.done.title">Berhasil!</h2>
          <p class="auth-panel-lead" data-i18n="auth.done.lead">Password Anda telah berhasil direset. Silakan login dengan password baru Anda.</p>
          <div class="auth-form">
            <p class="auth-note">{I['info']}<span data-i18n="auth.done.note">Pada aplikasi nyata Anda akan diarahkan otomatis ke halaman login.</span></p>
            <a class="landing-btn landing-btn--primary landing-btn--full" href="./index.html">{I['login']}<span data-i18n="auth.done.login">Login Sekarang</span></a>
          </div>
          <p class="auth-foot"><a class="auth-link" href="./index.html" data-i18n="auth.backToLogin">Kembali ke Login</a></p>'''

# --------------------------------------------------------------------------- #
# 4 & 5. HALAMAN STATUS
# --------------------------------------------------------------------------- #
def state_body(code, icon, title_key, title, sub_key, sub, lead_key, lead,
               actions, chip=None, extra='', code_color=None):
    chip_html = ''
    if chip:
        ck, cv, variant = chip
        chip_html = f'      <p class="auth-state-chip{variant}" data-i18n="{ck}">{cv}</p>\n'
    # Kode error dulu berdiri sendiri di bawah ilustrasi; sekarang tampil di
    # dalam layar seperti pada referensi, jadi barisnya tidak perlu lagi.
    code_html = ''
    btns = '\n'.join(
        f'        <a class="landing-btn {cls}" href="{href}">{I[ic] if ic else ""}<span data-i18n="{k}">{lbl}</span></a>'
        for cls, href, ic, k, lbl in actions)
    return f'''  <section class="landing-section">
    <div class="landing-container">
      <div class="auth-state">
{icon}
{chip_html}{code_html}
        <h1 class="auth-state-title auth-reveal" data-auth-reveal><span data-i18n="{title_key}">{title}</span> <em data-i18n="{sub_key}">{sub}</em></h1>
        <p class="auth-state-lead auth-reveal" data-auth-reveal data-i18n="{lead_key}">{lead}</p>
{extra}
        <div class="auth-state-actions auth-reveal" data-auth-reveal>
{btns}
        </div>
      </div>

      <div class="auth-help auth-reveal" data-auth-reveal>
        <p class="auth-help-title">{I['headset']}<span data-i18n="auth.help.title">Butuh bantuan? Tim kami siap membantu Anda 24/7.</span></p>
        <div class="auth-help-links">
          <a href="#kontak">{I['mail']}<span>help@padev.com</span></a>
          <a href="#kontak">{I['phone']}<span>(021) 1234 5678</span></a>
        </div>
      </div>
    </div>
  </section>'''


ERRORS = [
 ('error-401', '401', 'lock', 'auth.e401.t', '401 —', 'auth.e401.s', 'Unauthorized',
  'auth.e401.l', 'Anda belum terautentikasi. Untuk mengakses halaman ini, silakan masuk ke akun Anda atau kembali ke halaman sebelumnya.',
  [('landing-btn--primary', './index.html', 'login', 'auth.e401.a1', 'Masuk ke Akun'),
   ('landing-btn--ghost', f'{HOME}index.html', None, 'auth.backHome', 'Kembali ke Beranda')]),
 ('error-403', '403', 'shield', 'auth.e403.t', '403 —', 'auth.e403.s', 'Forbidden',
  'auth.e403.l', 'Akun Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini. Silakan hubungi administrator jika ini adalah kesalahan.',
  [('landing-btn--primary', f'{HOME}index.html', None, 'auth.backHome', 'Kembali ke Beranda'),
   ('landing-btn--ghost', '#kontak', 'headset', 'auth.e403.a2', 'Hubungi Administrator')]),
 ('error-404', '404', 'search', 'auth.e404.t', '404 —', 'auth.e404.s', 'Not Found',
  'auth.e404.l', 'Halaman yang Anda cari tidak ditemukan. Halaman mungkin telah dipindahkan, dihapus, atau URL yang Anda masukkan tidak valid.',
  [('landing-btn--primary', f'{HOME}index.html', None, 'auth.backHome', 'Kembali ke Beranda'),
   ('landing-btn--ghost', '#fitur', 'grid', 'auth.e404.a2', 'Jelajahi Fitur')]),
 ('error-419', '419', 'hourglass', 'auth.e419.t', '419 —', 'auth.e419.s', 'Session Expired',
  'auth.e419.l', 'Sesi Anda telah berakhir. Untuk keamanan, sesi berakhir otomatis karena terlalu lama tidak ada aktivitas.',
  [('landing-btn--primary', './index.html', 'login', 'auth.e419.a1', 'Masuk Kembali'),
   ('landing-btn--ghost', f'{HOME}index.html', None, 'auth.backHome', 'Kembali ke Beranda')]),
 ('error-429', '429', 'clock', 'auth.e429.t', '429 —', 'auth.e429.s', 'Terlalu Banyak Percobaan',
  'auth.e429.l', 'Terlalu banyak percobaan login gagal. Demi keamanan akun, silakan coba lagi dalam beberapa menit.',
  [('landing-btn--primary', './index.html', 'clock', 'auth.e429.a1', 'Coba Lagi Nanti'),
   ('landing-btn--ghost', './index.html', None, 'auth.e419.a1', 'Kembali ke Masuk')]),
 ('error-500', '500', 'gear', 'auth.e500.t', '500 —', 'auth.e500.s', 'Auth Service Error',
  'auth.e500.l', 'Terjadi kesalahan pada layanan autentikasi. Tim kami telah diberi tahu dan sedang memperbaikinya.',
  [('landing-btn--primary', './index.html', 'gear', 'auth.e500.a1', 'Coba Lagi'),
   ('landing-btn--ghost', '#kontak', 'headset', 'auth.e500.a2', 'Hubungi Support')]),
]

countdown_html = f'''        <div class="auth-countdown auth-reveal" data-auth-reveal data-auth-countdown>
{chr(10).join(f'          <div><strong data-unit="{u}">00</strong><span data-i18n="auth.soon.{u}">{lbl}</span></div>' for u, lbl in [('days','Hari'),('hours','Jam'),('minutes','Menit'),('seconds','Detik')])}
        </div>
        <p class="mt-3 font-ui text-xs text-ink-body auth-reveal" data-auth-reveal data-i18n="auth.soon.launch">Peluncuran dalam:</p>'''

progress_html = f'''        <div class="auth-progress auth-reveal" data-auth-reveal data-auth-progress data-value="72" aria-label="Progres perbaikan">
          <div class="auth-progress-track"><div class="auth-progress-bar"></div></div>
          <p class="mt-2 font-ui text-xs text-ink-body"><span data-i18n="auth.maint.eta">Perkiraan selesai</span> — <strong>02 <span data-i18n="auth.soon.hours">Jam</span> 15 <span data-i18n="auth.soon.minutes">Menit</span></strong> · 72%</p>
        </div>'''

status_chip_html = f'''        <p class="auth-state-note auth-reveal" data-auth-reveal>{I['info']}<span data-i18n="auth.pending.status">Status: Menunggu Verifikasi</span></p>
        <p class="auth-note mx-auto mt-4 max-w-sm auth-reveal" data-auth-reveal>{I['clock']}<span><span data-i18n="auth.pending.eta">Diperkirakan selesai dalam</span> <strong data-i18n="auth.pending.etaValue">1–2 hari kerja</strong></span></p>'''

STATES = [
 ('coming-soon', None, I['rocket'].replace('<svg', '<svg class="h-16 w-16" style="color: rgb(var(--primary-600))"'),
  'auth.soon.t', 'Fitur ini', 'auth.soon.s', 'Segera Hadir!',
  'auth.soon.l', 'Kami sedang menyiapkan pengalaman terbaik untuk Anda. Nantikan update dan pengumuman selanjutnya.',
  [('landing-btn--primary', '#kontak', 'mail', 'auth.soon.a1', 'Beritahu Saya Saat Tersedia'),
   ('landing-btn--ghost', f'{HOME}index.html', None, 'auth.backHome', 'Kembali ke Beranda')],
  ('auth.soon.chip', 'Coming Soon', ''), countdown_html),
 ('maintenance', None, I['gear'].replace('<svg', '<svg class="h-16 w-16" style="color: rgb(var(--primary-600))"'),
  'auth.maint.t', 'Sistem Sedang', 'auth.maint.s', 'Dalam Perbaikan',
  'auth.maint.l', 'Kami sedang melakukan pembaruan untuk meningkatkan performa dan stabilitas sistem. Terima kasih atas kesabaran Anda.',
  [('landing-btn--primary', './maintenance.html', 'gear', 'auth.maint.a1', 'Cek Status Sistem'),
   ('landing-btn--ghost', f'{HOME}index.html', None, 'auth.backHome', 'Kembali ke Beranda')],
  ('auth.maint.chip', 'Maintenance / Server Update', ' auth-state-chip--warning'), progress_html),
 ('pending-approval', None, I['hourglass'].replace('<svg', '<svg class="h-16 w-16" style="color: rgb(var(--primary-600))"'),
  'auth.pending.t', 'Akun Anda Masih', 'auth.pending.s', 'Menunggu Persetujuan',
  'auth.pending.l', 'Kami sedang meninjau informasi yang Anda berikan. Anda akan mendapatkan akses setelah disetujui.',
  [('landing-btn--primary', '#kontak', 'info', 'auth.pending.a1', 'Lihat Status Permohonan'),
   ('landing-btn--ghost', './index.html', None, 'auth.pending.a2', 'Logout')],
  ('auth.pending.chip', 'Pending Access / Waiting Approval', ' auth-state-chip--warning'), status_chip_html),
]

# --------------------------------------------------------------------------- #
# Tulis semua halaman
# --------------------------------------------------------------------------- #
pages = {
    'index.html': ('Login', login_body),
    'register.html': ('Daftar Akun', register_body),
    'forgot-password.html': ('Lupa Password', reset_page_body(0, forgot_panel)),
    'check-email.html': ('Cek Email', reset_page_body(1, check_panel)),
    'reset-password.html': ('Reset Password', reset_page_body(2, reset_panel)),
    'reset-success.html': ('Berhasil', reset_page_body(3, done_panel)),
}

for slug, code, icon, tk, tv, sk, sv, lk, lv, actions in ERRORS:
    # `icon` di ERRORS adalah NAMA ikon; harus dicari dulu di I[] sebelum
    # dipakai. Versi sebelumnya memanggil .replace() pada nama itu sendiri,
    # sehingga yang tercetak adalah teks "lock"/"shield" — bukan gambar.
    pages[f'{slug}.html'] = (f'{code} {sv}', state_body(
        code,
        screen_illustration(f'<span class="auth-illus-code">{code}</span>',
                            orn=(icon, 'shield', 'bolt')),
        tk, tv, sk, sv, lk, lv, actions))

for slug, code, icon, tk, tv, sk, sv, lk, lv, actions, chip, extra in STATES:
    pages[f'{slug}.html'] = (sv, state_body(
        code, screen_illustration(icon), tk, tv, sk, sv, lk, lv, actions, chip, extra))

os.makedirs('src/pages', exist_ok=True)
for name, (title, body) in pages.items():
    with open(f'src/pages/{name}', 'w') as fh:
        fh.write(page(name[:-5], title, body))

print(f'{len(pages)} halaman ditulis:')
for n in sorted(pages): print('  ', n)
