/**
 * PA DEV Navbar Search — mengaktifkan kolom cari di topbar.
 *
 * Sebelumnya kolomnya ada tetapi tanpa perilaku, dan tombol cari versi mobile
 * ditandai data-placeholder ("segera hadir"). Sekarang:
 *   - Enter  -> membuka search-results.html dengan query
 *   - "/"    -> memfokuskan kolom dari mana pun (kecuali saat mengetik)
 *   - Escape -> mengosongkan dan melepas fokus
 *   - tombol cari mobile memfokuskan kolom, bukan tidak melakukan apa-apa
 */
'use strict';

(function initNavbarSearch() {
  const box = document.querySelector('.navbar-search');
  const input = box?.querySelector('input');
  if (!input) return;

  input.removeAttribute('readonly');
  input.removeAttribute('disabled');
  box.closest('[data-placeholder]')?.removeAttribute('data-placeholder');

  const submit = () => {
    const q = input.value.trim();
    if (!q) { input.focus(); return; }
    window.location.href = `./search-results.html?q=${encodeURIComponent(q)}`;
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); submit(); }
    if (event.key === 'Escape') { input.value = ''; input.blur(); }
  });

  box.querySelector('.navbar-search-icon')?.addEventListener('click', submit);

  // Tombol cari khusus mobile: fokuskan kolom.
  document.querySelectorAll('[data-search-open], .navbar-icon-btn[aria-label^="Cari"], .navbar-icon-btn[aria-label^="Search"]')
    .forEach((button) => {
      button.removeAttribute('data-placeholder');
      button.addEventListener('click', (event) => {
        event.preventDefault();
        box.scrollIntoView({ block: 'nearest' });
        input.focus();
      });
    });

  // Pintasan "/" seperti aplikasi admin pada umumnya.
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey) return;
    const el = document.activeElement;
    if (el && /^(input|textarea|select)$/i.test(el.tagName)) return;
    if (el?.isContentEditable) return;
    event.preventDefault();
    input.focus();
  });

  // Isi ulang query saat berada di halaman hasil.
  const q = new URLSearchParams(window.location.search).get('q');
  if (q) input.value = q;
})();
