/**
 * Halaman setelan: Homepage dan Settings.
 *
 * Keduanya bukan CRUD — tidak ada baris yang ditambah atau dihapus, hanya
 * sekumpulan nilai yang disunting. Karena itu halaman ini tidak memakai mesin
 * tabel sama sekali; bentuknya kartu formulir, memakai primitif yang sama
 * dengan halaman Profil dan formulir User Management (`.card`, `.form-stack`,
 * `.form-grid`, `.form-actions`).
 *
 * DAFTAR FIELD DATANG DARI SERVER. Berkas ini tidak menyimpan satu pun nama
 * field: `GET /api/admin/settings/:grup` mengirimkan seksi beserta fieldnya,
 * dan halaman merendernya apa adanya. Menambah field cukup dilakukan di
 * `settings-modules.js` — tidak ada daftar kedua di sisi layar yang bisa
 * diam-diam berbeda.
 */
'use strict';

(function initPadevSettings() {
  const main = document.querySelector('[data-padev-settings]');
  if (!main) return;

  const grup = main.dataset.padevSettings;
  const panel = main.querySelector('[data-padev-panel]');
  const aksiBar = main.querySelector('[data-padev-actions]');

  const el = (tag, kelas, isi) => {
    const n = document.createElement(tag);
    if (kelas) n.className = kelas;
    if (isi !== undefined) n.textContent = isi;
    return n;
  };

  const minta = async (url, opsi = {}) => {
    const r = await fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json', ...(opsi.body ? { 'Content-Type': 'application/json' } : {}) },
      ...opsi,
    });
    if (r.status === 401) {
      window.location.replace(`/auth/?next=${encodeURIComponent(window.location.pathname)}`);
      throw new Error('Sesi berakhir');
    }
    const isi = await r.json().catch(() => null);
    if (!r.ok) {
      const e = new Error(isi?.message || 'Permintaan gagal');
      e.errors = isi?.errors || {};
      throw e;
    }
    return isi;
  };

  const toastRegion = el('div', 'ui-toast-region');
  toastRegion.dataset.padevToastRegion = 'true';
  toastRegion.setAttribute('aria-live', 'polite');
  document.body.append(toastRegion);

  const toast = (pesan, jenis = 'success') => {
    if (window.PADevToast) return window.PADevToast(pesan, jenis === 'danger' ? 'error' : jenis);
    const k = el('article', `ui-toast ui-feedback--${jenis}`);
    k.setAttribute('role', jenis === 'danger' ? 'alert' : 'status');
    const isi = el('div');
    isi.append(el('strong', null, jenis === 'danger' ? 'Gagal' : 'Berhasil'), el('p', null, pesan));
    k.append(isi);
    toastRegion.append(k);
    window.setTimeout(() => k.remove(), 4200);
  };

  /** Satu label + kontrol, susunan yang sama dengan formulir User Management. */
  const bidang = (field, nilai) => {
    const wrap = el('label');
    wrap.append(el('span', null, field.label));

    let kontrol;
    if (field.type === 'textarea') {
      kontrol = document.createElement('textarea');
      kontrol.rows = 3;
    } else if (field.type === 'select') {
      kontrol = document.createElement('select');
      field.options.forEach((o) => kontrol.append(new Option(o.label, o.value)));
    } else {
      kontrol = document.createElement('input');
      kontrol.type = field.type === 'email' ? 'email' : 'text';
    }
    kontrol.name = field.name;
    kontrol.value = nilai ?? '';
    wrap.append(kontrol);

    if (field.help) wrap.append(el('small', null, field.help));
    const galat = el('span', 'field-error');
    galat.dataset.galat = field.name;
    wrap.append(galat);
    return wrap;
  };

  const gambar = ({ sections, data }) => {
    const form = document.createElement('form');
    form.className = 'stack';
    form.noValidate = true;

    sections.forEach((seksi) => {
      const kartu = el('article', 'card form-stack');
      kartu.append(el('h2', null, seksi.title));
      if (seksi.description) kartu.append(el('p', 'muted', seksi.description));

      /* Dua kolom untuk field pendek, satu kolom penuh untuk textarea:
       * memaksa area teks panjang masuk setengah lebar membuat kalimatnya
       * terpotong-potong dan justru lebih sulit disunting. */
      const pendek = seksi.fields.filter((f) => f.type !== 'textarea');
      const panjang = seksi.fields.filter((f) => f.type === 'textarea');

      if (pendek.length) {
        const grid = el('div', 'form-grid');
        pendek.forEach((f) => grid.append(bidang(f, data[f.name])));
        kartu.append(grid);
      }
      panjang.forEach((f) => kartu.append(bidang(f, data[f.name])));
      form.append(kartu);
    });

    const aksi = el('div', 'form-actions');
    const simpan = el('button', 'ui-button ui-button--primary', 'Simpan setelan');
    simpan.type = 'submit';
    aksi.append(simpan);
    form.append(aksi);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      form.querySelectorAll('[data-galat]').forEach((n) => { n.textContent = ''; });
      const isi = Object.fromEntries(new FormData(form).entries());
      const semula = simpan.textContent;
      const memakaiFeedback = Boolean(window.PADevButton?.busy(simpan, 'Menyimpan…'));
      if (!memakaiFeedback) {
        simpan.disabled = true;
        simpan.textContent = 'Menyimpan…';
      }
      try {
        const hasil = await minta(`/api/admin/settings/${grup}`, {
          method: 'PUT',
          body: JSON.stringify(isi),
        });
        toast(hasil.message);
      } catch (error) {
        Object.entries(error.errors || {}).forEach(([nama, pesan]) => {
          const slot = form.querySelector(`[data-galat="${nama}"]`);
          if (slot) slot.textContent = pesan;
        });
        toast(error.message, 'danger');
      } finally {
        if (memakaiFeedback) window.PADevButton.idle(simpan);
        else {
          simpan.disabled = false;
          simpan.textContent = semula;
        }
      }
    });

    panel.replaceChildren(form);
  };

  const muat = async () => {
    try {
      gambar(await minta(`/api/admin/settings/${grup}`));
    } catch (error) {
      panel.replaceChildren(el('p', 'empty', error.message));
    }
  };

  if (aksiBar) aksiBar.replaceChildren();
  muat();
}());
