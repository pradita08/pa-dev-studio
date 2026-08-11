/* PA DEV Admin feedback contract.
 *
 * Semua aksi simpan/hapus/unggah memakai satu region di pojok kanan atas.
 * `error` dan `danger` sengaja dipetakan ke nada merah yang sudah menjadi
 * token tema; sukses memakai token hijau. Fungsi ini tidak bergantung pada
 * framework dan aman dipanggil dari halaman lama maupun modul baru.
 */
(function pasangPadevFeedback() {
  'use strict';

  const bentukIkon = {
    success: '<path d="m5 12 4 4L19 6"/>',
    danger: '<path d="M12 8v5M12 17h.01"/><circle cx="12" cy="12" r="9"/>',
    warning: '<path d="M12 8v5M12 17h.01"/><path d="m10.3 4.9-7.1 12.3A1.2 1.2 0 0 0 4.2 19h15.6a1.2 1.2 0 0 0 1-1.8L13.7 4.9a2 2 0 0 0-3.4 0Z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    neutral: '<circle cx="12" cy="12" r="9"/><path d="M9 12h6"/>',
  };

  const judulNada = {
    success: 'Berhasil',
    danger: 'Gagal',
    warning: 'Perhatian',
    info: 'Informasi',
    neutral: 'Info',
  };

  const region = () => {
    let node = document.querySelector('[data-padev-toast-region]');
    if (!node) {
      node = document.createElement('div');
      node.className = 'ui-toast-region';
      node.dataset.padevToastRegion = 'true';
      node.setAttribute('aria-live', 'polite');
      document.body.append(node);
    }
    return node;
  };

  const hapusToast = (toast) => {
    if (!toast || toast.dataset.leaving === 'true') return;
    toast.dataset.leaving = 'true';
    toast.classList.add('is-leaving');
    window.setTimeout(() => toast.remove(), 180);
  };

  /* Selalu pasang kontrak bersama. Beberapa modul lama mendefinisikan
   * fallback sebelum berkas ini dimuat; kontrak bersama harus tetap menang
   * agar semua halaman mendapatkan markup ikon dan tombol tutup yang sama. */
  window.PADevToast = (message, tone = 'success', { duration = 4200 } = {}) => {
    const type = tone === 'error' ? 'danger' : (bentukIkon[tone] ? tone : 'neutral');
    const toast = document.createElement('article');
    toast.className = `ui-toast ui-feedback--${type}`;
    toast.setAttribute('role', type === 'danger' ? 'alert' : 'status');

    const icon = document.createElement('span');
    icon.className = 'ui-toast-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.innerHTML = `<svg viewBox="0 0 24 24">${bentukIkon[type]}</svg>`;

    const body = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = judulNada[type];
    const detail = document.createElement('p');
    detail.textContent = String(message || '');
    body.append(title, detail);

    const close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('aria-label', 'Tutup notifikasi');
    close.textContent = '×';
    close.addEventListener('click', () => hapusToast(toast));

    toast.append(icon, body, close);
    region().append(toast);
    if (duration > 0) window.setTimeout(() => hapusToast(toast), duration);
    return toast;
  };

  const buttonStates = new WeakMap();
  const busy = (button, label = 'Memuat…') => {
    if (!button || buttonStates.has(button)) return false;
    buttonStates.set(button, {
      html: button.innerHTML,
      disabled: button.disabled,
      ariaBusy: button.getAttribute('aria-busy'),
    });
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.classList.add('is-loading');

    const content = document.createElement('span');
    content.className = 'ui-button-content';
    content.textContent = String(label || 'Memuat…');
    const spinner = document.createElement('span');
    spinner.className = 'ui-button-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    button.replaceChildren(content, spinner);
    return true;
  };

  const idle = (button) => {
    const state = buttonStates.get(button);
    if (!state) return false;
    button.innerHTML = state.html;
    button.disabled = state.disabled;
    if (state.ariaBusy === null) button.removeAttribute('aria-busy');
    else button.setAttribute('aria-busy', state.ariaBusy);
    button.classList.remove('is-loading');
    buttonStates.delete(button);
    return true;
  };

  window.PADevButton = window.PADevButton || Object.freeze({ busy, idle });
}());
