/* PA DEV Admin feedback contract.
 *
 * Semua aksi simpan/hapus/unggah memakai satu region di pojok kanan atas.
 * `error` dan `danger` sengaja dipetakan ke nada merah yang sudah menjadi
 * token tema; sukses memakai token hijau. Fungsi ini tidak bergantung pada
 * framework dan aman dipanggil dari halaman lama maupun modul baru.
 */
(function pasangPadevFeedback() {
  'use strict';

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

  window.PADevToast = window.PADevToast || ((message, tone = 'success', { duration = 4200 } = {}) => {
    const type = tone === 'error' ? 'danger' : tone;
    const toast = document.createElement('article');
    toast.className = `ui-toast ui-feedback--${type}`;
    toast.setAttribute('role', type === 'danger' ? 'alert' : 'status');
    const body = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = type === 'danger' ? 'Gagal' : (type === 'warning' ? 'Perhatian' : 'Berhasil');
    const detail = document.createElement('p');
    detail.textContent = String(message || '');
    body.append(title, detail);
    toast.append(body);
    region().append(toast);
    window.setTimeout(() => toast.remove(), duration);
    return toast;
  });
}());
