/* Pengendali tabel PA DEV, dipindahkan dari API Bridge Gateway.
 *
 * Kontrak visualnya milik tema PA DEV Admin; perilakunya milik berkas ini.
 * Tidak ada atribut maupun runtime Table Engine/starter-kit yang dipakai.
 *
 * Kolom pilih, kontrol buka-tutup, baris detail bersarang, dan tombol urut
 * disuntikkan di sini, bukan ditulis ulang di tiap tampilan. Sebelas tabel yang
 * tersebar di tujuh template mustahil dijaga identik dengan tangan — justru
 * begitulah selisih yang jadi alasan berkas ini ada bermula. Tampilan hanya
 * menyatakan maksud: `data-sort` pada header yang bisa diurutkan, `data-detail`
 * pada header yang kolomnya masuk baris detail, dan boleh ada
 * `<tr class="ui-table-group-header">` di atas baris kolom.
 *
 * ── Penyesuaian untuk PA DEV Studio ──────────────────────────────────────────
 * Di gateway seluruh tabel digambar server (EJS) sehingga sudah lengkap saat
 * `DOMContentLoaded`. Di sini halaman User Management menggambar tabelnya
 * setelah data tiba, jadi:
 *
 *   1. `setupTable` dibuka sebagai `window.PADevTables.mount(root, opsi)`.
 *      Pemindaian otomatis saat muat tetap ada dan tetap aman: pada halaman ini
 *      belum ada tabel apa pun ketika ia berjalan.
 *   2. Pengirim aksi massal bisa diganti lewat `opsi.kirim`. Bawaannya tetap
 *      POST form-encoded seperti di gateway; API di sini berbicara JSON.
 *   3. Menu aksi ikut tertutup saat item ber-`role="menuitem"` diklik, bukan
 *      hanya tautan dan tombol submit — di sini itemnya tombol biasa yang
 *      memanggil fetch sendiri, bukan form yang di-submit.
 *
 * Selain ketiga hal itu berkas ini sama dengan sumbernya.
 */
/* global document, window, Option, CustomEvent, fetch */

(function padevTables() {
  'use strict';

  const SORT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9 4-4 4 4M8 15l4 4 4-4"/></svg>';
  const CHEVRON_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  const text = (node) => (node ? node.textContent : '').replace(/\s+/g, ' ').trim();
  const isNumeric = (value) => /^-?\d+(?:[.,]\d+)?$/.test(value.trim());

  function setupActions(root) {
    const positionMenu = (trigger, menu) => {
      const gap = 6;
      const edge = 8;
      const triggerRect = trigger.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const placeAbove = spaceBelow < menuRect.height + gap && spaceAbove > spaceBelow;
      let top = placeAbove ? triggerRect.top - menuRect.height - gap : triggerRect.bottom + gap;
      let left = triggerRect.right - menuRect.width;
      if (left < edge) left = triggerRect.left;
      left = Math.min(Math.max(edge, left), window.innerWidth - menuRect.width - edge);
      top = Math.min(Math.max(edge, top), window.innerHeight - menuRect.height - edge);
      menu.style.left = `${Math.round(left)}px`;
      menu.style.top = `${Math.round(top)}px`;
    };

    const closeMenus = (except) => root.querySelectorAll('[data-action-menu][data-open]').forEach((menu) => {
      if (menu !== except) {
        menu.removeAttribute('data-open');
        menu.hidden = true;
        menu.style.removeProperty('left');
        menu.style.removeProperty('top');
        menu.style.removeProperty('visibility');
        menu.closest('.ui-table-action-cell')?.classList.remove('is-menu-open');
        menu.previousElementSibling?.setAttribute('aria-expanded', 'false');
      }
    });

    root.querySelectorAll('[data-action-trigger]').forEach((trigger) => {
      const menu = trigger.parentElement?.querySelector('[data-action-menu]');
      if (!menu || trigger.dataset.padevBound) return;
      trigger.dataset.padevBound = 'true';
      trigger.addEventListener('click', () => {
        const open = menu.hasAttribute('data-open');
        closeMenus(menu);
        if (!open) {
          menu.hidden = false;
          menu.setAttribute('data-open', '');
          trigger.setAttribute('aria-expanded', 'true');
          /* The action cell is `position:sticky; z-index:30`, which makes it a
           * stacking context.  Without lifting the cell that owns the open
           * menu, the sticky action cells of the rows *below* — same z-index,
           * later in document order, opaque background — paint over the menu
           * and clip its labels.  The menu cannot simply be moved to <body>
           * instead: `admin-ui.js` deletes a row through `form.closest('tr')`.
           */
          menu.closest('.ui-table-action-cell')?.classList.add('is-menu-open');
          menu.style.visibility = 'hidden';
          positionMenu(trigger, menu);
          menu.style.visibility = 'visible';
        }
      });
      menu.addEventListener('click', (event) => {
        // `[role="menuitem"]` ikut disebut supaya item berupa tombol biasa —
        // yang memanggil API sendiri alih-alih men-submit form — tetap menutup
        // menunya. Item rujukan sudah membawa role itu, jadi perilakunya di
        // sana tidak berubah.
        if (event.target.closest('a,button[type="submit"],[role="menuitem"]')) closeMenus();
      });
    });
    if (!root.dataset.padevActionDocumentBound) {
      root.dataset.padevActionDocumentBound = 'true';
      document.addEventListener('click', (event) => {
        if (!event.target.closest('[data-action-trigger], [data-action-menu]')) closeMenus();
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenus();
      });
      window.addEventListener('scroll', () => closeMenus(), true);
      window.addEventListener('resize', () => closeMenus());
    }
  }

  /* Reference control columns, in the order the reference draws them:
   * selection checkbox, row number, then the expand chevron. All three are
   * frozen to the left; their offsets are declared in `padev-tables.css`. */
  function injectControlColumns(table, headRow, hasDetail) {
    const span = hasDetail ? 3 : 2;
    Array.from(table.tHead.rows).forEach((row) => {
      if (row === headRow) return;
      const spacer = document.createElement('th');
      spacer.colSpan = span;
      spacer.setAttribute('aria-hidden', 'true');
      row.prepend(spacer);
    });

    const checkHead = document.createElement('th');
    checkHead.className = 'ui-table-check ui-table-sticky-checkbox';
    const selectAll = document.createElement('input');
    selectAll.type = 'checkbox';
    selectAll.setAttribute('data-padev-select-all', '');
    selectAll.setAttribute('aria-label', 'Pilih semua baris pada halaman ini');
    checkHead.append(selectAll);
    headRow.prepend(checkHead);

    const rownumHead = document.createElement('th');
    rownumHead.className = 'ui-table-rownum ui-table-sticky-rownum';
    rownumHead.setAttribute('aria-hidden', 'true');
    checkHead.after(rownumHead);

    if (hasDetail) {
      const controlHead = document.createElement('th');
      controlHead.className = 'ui-table-row-control ui-table-sticky-control';
      controlHead.setAttribute('aria-hidden', 'true');
      rownumHead.after(controlHead);
    }

    table.querySelectorAll('tbody tr[data-row]').forEach((row) => {
      const checkCell = document.createElement('td');
      checkCell.className = 'ui-table-check ui-table-sticky-checkbox';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.setAttribute('data-padev-select', '');
      box.setAttribute('aria-label', 'Pilih baris ini');
      checkCell.append(box);
      row.prepend(checkCell);

      // Filled in by render(), because the reference numbers the rows as they
      // are currently ordered and paged, not by their position in the source.
      const rownumCell = document.createElement('td');
      rownumCell.className = 'ui-table-rownum ui-table-sticky-rownum';
      rownumCell.setAttribute('data-padev-rownum', '');
      checkCell.after(rownumCell);

      if (hasDetail) {
        const controlCell = document.createElement('td');
        controlCell.className = 'ui-table-row-control ui-table-sticky-control';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'ui-table-row-toggle';
        toggle.setAttribute('data-padev-expand', '');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Tampilkan detail baris');
        toggle.innerHTML = CHEVRON_ICON;
        controlCell.append(toggle);
        rownumCell.after(controlCell);
      }
    });

    table.querySelectorAll('tbody tr[data-table-empty] > td[colspan]').forEach((cell) => {
      cell.colSpan = Number(cell.colSpan || 1) + span;
    });
  }

  /* One nested row per data row, built from the columns the view marked
   * `data-detail`.  Those columns leave the main row, which is what keeps a
   * seven-column table readable at the reference density. */
  function buildDetailRows(table, headRow, detailIndexes, labels) {
    const nested = new Map();
    const columnCount = headRow.cells.length;
    /* A detail column is hidden through the same `hidden` flag the View panel
     * drives, so re-checking it there simply brings the column back into the
     * main row.  The marker class only tells card mode and print to reveal it. */
    detailIndexes.forEach((index) => {
      const header = headRow.cells[index];
      if (!header) return;
      header.classList.add('padev-detail-column');
      header.hidden = true;
    });

    table.querySelectorAll('tbody tr[data-row]').forEach((row) => {
      const detailRow = document.createElement('tr');
      detailRow.className = 'ui-table-nested';
      detailRow.setAttribute('data-nested-for', '');
      detailRow.hidden = true;
      const cell = document.createElement('td');
      cell.colSpan = columnCount;
      const list = document.createElement('div');

      detailIndexes.forEach((index) => {
        const source = row.cells[index];
        if (!source) return;
        source.classList.add('padev-detail-column');
        source.hidden = true;
        const item = document.createElement('span');
        const label = document.createElement('strong');
        label.textContent = labels[index] || '';
        item.append(label, ' ');
        Array.from(source.childNodes).forEach((node) => item.append(node.cloneNode(true)));
        list.append(item);
      });

      cell.append(list);
      detailRow.append(cell);
      row.after(detailRow);
      nested.set(row, detailRow);

      row.querySelector('[data-padev-expand]')?.addEventListener('click', (event) => {
        const button = event.currentTarget;
        const open = !row.classList.contains('is-expanded');
        row.classList.toggle('is-expanded', open);
        button.setAttribute('aria-expanded', String(open));
        detailRow.hidden = !open || row.hidden;
      });
    });

    return nested;
  }

  /* The theme pinned the column row with a hardcoded `2rem`. When the real
   * grouped-header row is not exactly 2rem tall the column row lands short and
   * body rows show through the gap. Measure it instead, and round to a whole
   * pixel so the pinned row never lands on a fractional offset and shimmers. */
  function syncStickyOffset(root, table) {
    const scroll = root.querySelector('.ui-table-scroll');
    const headRows = table.tHead ? Array.from(table.tHead.rows) : [];
    if (!scroll || headRows.length < 2) return;
    const apply = () => {
      const height = Math.round(headRows[0].getBoundingClientRect().height);
      scroll.style.setProperty('--padev-group-header-height', `${height}px`);
    };
    apply();
    if (typeof window.ResizeObserver === 'function') {
      new window.ResizeObserver(apply).observe(headRows[0]);
    } else {
      window.addEventListener('resize', apply);
    }
  }

  /* Reference footer band: the total, then one tally per option of the table's
   * own status filter. Every view already declares those options, so the band
   * needs no extra per-table wiring. */
  function buildSummary(root, countLabel) {
    const band = root.querySelector('[data-padev-summary]');
    if (!band) return null;
    const filter = root.querySelector('[data-padev-filter]');
    const buckets = filter
      ? Array.from(filter.options).filter((option) => option.value).map((option) => ({
        key: filter.dataset.padevFilter,
        match: filter.dataset.padevMatch,
        value: option.value,
        label: option.textContent.trim().toLowerCase(),
      }))
      : [];
    const total = document.createElement('span');
    band.append(total);
    const tallies = buckets.map((bucket) => {
      const node = document.createElement('span');
      band.append(node);
      return { bucket, node };
    });
    return (rows) => {
      total.textContent = `${rows.length} ${countLabel}`;
      tallies.forEach(({ bucket, node }) => {
        const count = rows.filter((row) => {
          const actual = row.dataset[bucket.key] || '';
          return bucket.match === 'list'
            ? actual.split(',').map((item) => item.trim()).includes(bucket.value)
            : actual === bucket.value;
        }).length;
        node.textContent = `${count} ${bucket.label}`;
      });
    };
  }

  function setupSorting(headRow, applySort) {
    const state = { index: -1, direction: 0 };
    Array.from(headRow.cells).forEach((header, index) => {
      if (!header.hasAttribute('data-sort')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ui-table-sort';
      const label = document.createElement('span');
      label.textContent = text(header);
      button.append(label);
      button.insertAdjacentHTML('beforeend', SORT_ICON);
      header.textContent = '';
      header.append(button);
      header.setAttribute('aria-sort', 'none');

      button.addEventListener('click', () => {
        // asc -> desc -> back to the order the server sent.
        if (state.index !== index) { state.index = index; state.direction = 1; }
        else if (state.direction === 1) state.direction = -1;
        else { state.index = -1; state.direction = 0; }

        Array.from(headRow.cells).forEach((cell) => {
          cell.classList.remove('is-sorted-asc', 'is-sorted-desc');
          if (cell.hasAttribute('data-sort')) cell.setAttribute('aria-sort', 'none');
        });
        if (state.direction) {
          header.classList.add(state.direction === 1 ? 'is-sorted-asc' : 'is-sorted-desc');
          header.setAttribute('aria-sort', state.direction === 1 ? 'ascending' : 'descending');
        }
        applySort(state.index, state.direction);
      });
    });
  }

  function setupColumns(root, headRow, labels) {
    const fieldset = root.querySelector('[data-padev-columns]');
    if (!fieldset || fieldset.dataset.padevReady) return;
    fieldset.dataset.padevReady = 'true';
    const table = headRow.closest('table');

    Array.from(headRow.cells).forEach((header, index) => {
      if (!labels[index] || header.classList.contains('ui-table-action-cell')) return;
      const label = document.createElement('label');
      label.className = 'ui-choice ui-choice--table-column';
      const input = document.createElement('input');
      input.className = 'ui-choice-input';
      input.type = 'checkbox';
      input.checked = !header.hidden;
      input.dataset.padevColumn = String(index);
      const copy = document.createElement('span');
      copy.className = 'ui-choice-copy';
      copy.innerHTML = '<span class="ui-choice-label"></span>';
      copy.querySelector('.ui-choice-label').textContent = labels[index];
      label.append(input, copy);
      fieldset.querySelector('p')?.remove();
      fieldset.append(label);

      input.addEventListener('change', () => {
        const hidden = !input.checked;
        header.hidden = hidden;
        table.querySelectorAll('tbody tr[data-row]').forEach((row) => {
          const cell = row.cells[index];
          if (cell) cell.hidden = hidden;
        });
      });
    });
  }

  /* Pengirim aksi massal bawaan: POST form-encoded ke endpoint per baris,
   * persis seperti di gateway. Halaman yang API-nya berbicara JSON menyerahkan
   * penggantinya lewat `opsi.kirim`. */
  const kirimBawaan = async ({ url, token, extra }) => {
    const body = new URLSearchParams();
    if (token) body.set('_csrf', token);
    if (extra) new URLSearchParams(extra).forEach((value, name) => body.set(name, value));
    const response = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.message || 'Ditolak server.');
  };

  function setupTable(root, opsi = {}) {
    const kirim = opsi.kirim || kirimBawaan;
    const table = root.querySelector('table');
    const body = table?.tBodies[0];
    if (!table || !body || !table.tHead || root.dataset.padevReady) return;
    root.dataset.padevReady = 'true';

    const headRow = table.tHead.rows[table.tHead.rows.length - 1];
    const detailHeaders = Array.from(headRow.cells).filter((cell) => cell.hasAttribute('data-detail'));
    injectControlColumns(table, headRow, detailHeaders.length > 0);

    const labels = Array.from(headRow.cells).map(text);
    const detailIndexes = Array.from(headRow.cells)
      .map((cell, index) => (cell.hasAttribute('data-detail') ? index : -1))
      .filter((index) => index >= 0);
    const nestedRows = detailIndexes.length
      ? buildDetailRows(table, headRow, detailIndexes, labels)
      : new Map();

    const rows = Array.from(body.querySelectorAll('tr[data-row]'));
    const originalOrder = rows.slice();
    let order = rows.slice();

    table.querySelectorAll('tbody tr[data-row]').forEach((row) => Array.from(row.cells).forEach((cell, index) => {
      if (labels[index]) cell.dataset.label = labels[index];
    }));

    const toolbar = root.querySelector('[data-padev-toolbar]');
    const search = toolbar?.querySelector('[data-padev-search]');
    const filters = Array.from(root.querySelectorAll('[data-padev-filter]'));
    const pageSizeSelect = root.querySelector('[data-padev-page-size]');
    const pager = root.querySelector('[data-padev-pager]');
    const pageSummary = root.querySelector('[data-padev-page-summary]');
    const pageButtons = root.querySelector('[data-page-buttons]');
    const prev = root.querySelector('[data-padev-prev]');
    const next = root.querySelector('[data-padev-next]');
    const count = root.querySelector('[data-padev-count]');
    const bulk = root.querySelector('[data-padev-bulk]');
    const bulkCount = root.querySelector('[data-padev-bulk-count]');
    const selectAll = root.querySelector('[data-padev-select-all]');
    const empty = body.querySelector('tr[data-table-empty]');
    const countLabel = toolbar?.dataset.padevCountLabel || 'data';
    const summaryBand = root.querySelector('[data-padev-summary]');
    const renderSummary = buildSummary(root, countLabel);

    let page = 1;
    const configuredSize = Number(root.dataset.pageSize || pageSizeSelect?.value || 10);
    let pageSize = configuredSize > 0 ? configuredSize : 10;
    if (pageSizeSelect) {
      if (!Array.from(pageSizeSelect.options).some((option) => Number(option.value) === pageSize)) {
        pageSizeSelect.append(new Option(String(pageSize), String(pageSize)));
      }
      pageSizeSelect.value = String(pageSize);
    }

    /* The reference puts the pagination footer below the scroll area. Keeping
     * the shared partial in one piece means normalizing that position here
     * instead of asking every view to include a second partial. */
    const tableScroll = root.querySelector('.ui-table-scroll');
    if (tableScroll) {
      // Reference order below the table: summary band, then pagination.
      if (summaryBand) tableScroll.after(summaryBand);
      if (pager) (summaryBand || tableScroll).after(pager);
    }

    const matches = (row) => {
      const needle = (search?.value || '').trim().toLowerCase();
      if (needle && !(row.dataset.search || text(row)).toLowerCase().includes(needle)) return false;
      return filters.every((filter) => {
        const value = filter.value;
        if (!value) return true;
        const actual = row.dataset[filter.dataset.padevFilter] || '';
        return filter.dataset.padevMatch === 'list'
          ? actual.split(',').map((item) => item.trim()).includes(value)
          : actual === value;
      });
    };

    const sortValue = (row, index) => {
      const cell = row.cells[index];
      if (!cell) return '';
      return cell.dataset.sortValue !== undefined ? cell.dataset.sortValue : text(cell);
    };

    const applySort = (index, direction) => {
      if (!direction || index < 0) order = originalOrder.slice();
      else {
        order = originalOrder.slice().sort((left, right) => {
          const a = sortValue(left, index);
          const b = sortValue(right, index);
          const result = isNumeric(a) && isNumeric(b)
            ? Number(a.replace(',', '.')) - Number(b.replace(',', '.'))
            : a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' });
          return result * direction;
        });
      }
      order.forEach((row) => {
        body.append(row);
        const nested = nestedRows.get(row);
        if (nested) body.append(nested);
      });
      page = 1;
      render();
    };

    const renderPageButtons = (totalPages) => {
      if (!pageButtons || !prev || !next) return;
      pageButtons.querySelectorAll('[data-padev-page]').forEach((button) => button.remove());
      // Reference window: first and last are always reachable, the current
      // page keeps a neighbour on each side, and gaps collapse into an ellipsis.
      const wanted = new Set([1, totalPages, page, page - 1, page + 1]);
      const numbers = Array.from(wanted).filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
      let previousNumber = 0;
      numbers.forEach((number) => {
        if (number - previousNumber > 1) {
          const gap = document.createElement('button');
          gap.type = 'button';
          gap.dataset.padevPage = 'gap';
          gap.disabled = true;
          gap.textContent = '…';
          pageButtons.insertBefore(gap, next);
        }
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.padevPage = String(number);
        button.textContent = String(number);
        button.classList.toggle('is-active', number === page);
        if (number === page) button.setAttribute('aria-current', 'page');
        button.addEventListener('click', () => { page = number; render(); });
        pageButtons.insertBefore(button, next);
        previousNumber = number;
      });
    };

    const syncSelection = () => {
      const boxes = order.filter((row) => !row.hidden).map((row) => row.querySelector('[data-padev-select]'));
      const checked = boxes.filter((box) => box?.checked);
      order.forEach((row) => row.classList.toggle('is-selected', !!row.querySelector('[data-padev-select]')?.checked));
      if (selectAll) {
        selectAll.checked = boxes.length > 0 && checked.length === boxes.length;
        selectAll.indeterminate = checked.length > 0 && checked.length < boxes.length;
      }
      const total = order.filter((row) => row.querySelector('[data-padev-select]')?.checked).length;
      if (bulkCount) bulkCount.textContent = `${total} ${countLabel} dipilih`;
      if (bulk) bulk.hidden = total === 0;
    };

    function render() {
      const matched = order.filter(matches);
      const totalPages = Math.max(1, Math.ceil(matched.length / pageSize));
      page = Math.min(Math.max(1, page), totalPages);
      const first = (page - 1) * pageSize;
      const shown = new Set(matched.slice(first, first + pageSize));

      order.forEach((row) => {
        const visible = shown.has(row);
        row.hidden = !visible;
        const nested = nestedRows.get(row);
        if (nested) nested.hidden = !visible || !row.classList.contains('is-expanded');
      });

      // The reference numbers rows by their place in the current result, so the
      // count follows sorting and paging rather than the source order.
      matched.forEach((row, index) => {
        const cell = row.querySelector('[data-padev-rownum]');
        if (cell) cell.textContent = String(index + 1);
      });

      if (renderSummary) renderSummary(matched);
      if (empty) empty.hidden = matched.length !== 0;
      if (count) count.textContent = `${matched.length} ${countLabel}`;
      if (pageSummary) {
        pageSummary.textContent = matched.length
          ? `Menampilkan ${first + 1}–${Math.min(first + pageSize, matched.length)} dari ${matched.length} ${countLabel}`
          : `Menampilkan 0 dari 0 ${countLabel}`;
      }
      if (prev) prev.disabled = page <= 1;
      if (next) next.disabled = page >= totalPages;
      renderPageButtons(totalPages);
      syncSelection();
      root.dispatchEvent(new CustomEvent('padev:table-rendered', { detail: { matched: matched.length, page } }));
    }

    search?.addEventListener('input', () => { page = 1; render(); });
    filters.forEach((filter) => filter.addEventListener('change', () => { page = 1; render(); }));
    pageSizeSelect?.addEventListener('change', () => { pageSize = Math.max(1, Number(pageSizeSelect.value) || 10); page = 1; render(); });
    prev?.addEventListener('click', () => { page -= 1; render(); });
    next?.addEventListener('click', () => { page += 1; render(); });

    selectAll?.addEventListener('change', () => {
      order.filter((row) => !row.hidden).forEach((row) => {
        const box = row.querySelector('[data-padev-select]');
        if (box) box.checked = selectAll.checked;
      });
      syncSelection();
    });
    body.addEventListener('change', (event) => {
      if (event.target.matches('[data-padev-select]')) syncSelection();
    });
    /* Aksi massal memanggil endpoint per baris yang sudah ada, satu per satu.
     * Tidak ada endpoint massal baru, jadi izin, penjaga admin-terakhir, dan
     * pencatatan audit tetap yang itu-itu juga. Kegagalan sebagian dilaporkan
     * apa adanya — baris yang ditolak server tetap tinggal supaya alasannya
     * bisa dibaca, bukan hilang seolah berhasil. */
    const runBulk = async (button) => {
      const key = button.dataset.padevBulkAction;
      const chosen = order.filter((row) => row.querySelector('[data-padev-select]')?.checked);
      const targets = chosen
        .map((row) => ({ row, url: row.dataset[`bulk${key.charAt(0).toUpperCase()}${key.slice(1)}`] }))
        .filter((item) => item.url);

      if (!chosen.length) return;
      if (!targets.length) {
        window.PADevToast?.('Tidak ada baris terpilih yang mendukung aksi ini.', 'warning');
        return;
      }
      const question = `${button.dataset.padevBulkConfirm} ${targets.length} ${countLabel}?`;
      const accepted = window.PADevConfirm
        ? await window.PADevConfirm({ tone: 'warning', title: button.textContent.trim(), message: question, confirmLabel: button.textContent.trim() })
        : window.confirm(question);
      if (!accepted) return;

      const token = bulk?.dataset.padevCsrf || '';
      const controls = root.querySelectorAll('[data-padev-bulk-action], [data-padev-bulk-clear]');
      controls.forEach((item) => { item.disabled = true; });
      let done = 0;
      const failures = [];
      for (const { row, url } of targets) {
        try {
          await kirim({
            url,
            key,
            row,
            token,
            extra: row.dataset[`bulk${key.charAt(0).toUpperCase()}${key.slice(1)}Body`],
          });
          done += 1;
          if (button.dataset.padevBulkAction === 'delete') {
            nestedRows.get(row)?.remove();
            row.remove();
            const index = order.indexOf(row);
            if (index >= 0) order.splice(index, 1);
            const source = originalOrder.indexOf(row);
            if (source >= 0) originalOrder.splice(source, 1);
          } else {
            const box = row.querySelector('[data-padev-select]');
            if (box) box.checked = false;
          }
        } catch (error) {
          failures.push(`${row.dataset.bulkLabel || 'baris'}: ${error.message}`);
        }
      }
      controls.forEach((item) => { item.disabled = false; });
      render();
      if (failures.length) {
        window.PADevToast?.(`${done} berhasil, ${failures.length} gagal — ${failures[0]}`, done ? 'warning' : 'error');
      } else {
        window.PADevToast?.(`${done} ${countLabel} diproses.`, 'success');
      }
    };
    root.querySelectorAll('[data-padev-bulk-action]').forEach((button) => button.addEventListener('click', () => runBulk(button)));

    root.querySelector('[data-padev-bulk-clear]')?.addEventListener('click', () => {
      order.forEach((row) => {
        const box = row.querySelector('[data-padev-select]');
        if (box) box.checked = false;
      });
      syncSelection();
    });

    root.querySelector('[data-padev-filter-toggle]')?.addEventListener('click', (event) => {
      const panel = root.querySelector('[data-padev-filter-panel]');
      if (!panel) return;
      panel.hidden = !panel.hidden;
      event.currentTarget.setAttribute('aria-expanded', String(!panel.hidden));
    });
    root.querySelector('[data-padev-filter-reset]')?.addEventListener('click', () => {
      filters.forEach((filter) => { filter.value = ''; });
      page = 1;
      render();
    });
    root.querySelector('[data-padev-cards]')?.addEventListener('click', (event) => {
      root.classList.toggle('is-card-mode');
      event.currentTarget.setAttribute('aria-pressed', String(root.classList.contains('is-card-mode')));
    });
    root.querySelectorAll('[data-padev-density]').forEach((button) => button.addEventListener('click', (event) => {
      const compact = event.currentTarget.dataset.padevDensity === 'compact';
      root.classList.toggle('is-compact', compact);
      root.querySelectorAll('[data-padev-density]').forEach((item) => {
        const active = item === event.currentTarget;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
    }));

    setupSorting(headRow, applySort);
    setupColumns(root, headRow, labels);
    setupActions(root);
    syncStickyOffset(root, table);
    render();
  }

  const init = () => document.querySelectorAll('[data-padev-table]').forEach((root) => setupTable(root));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* Tabel yang digambar setelah data tiba memanggil `mount` sendiri. `setupTable`
   * menandai akarnya dengan `data-padev-ready`, jadi memanggilnya dua kali pada
   * akar yang sama tidak melakukan apa-apa; setiap penggambaran ulang membuat
   * elemen akar baru. */
  window.PADevTables = { mount: setupTable, init };
}());
