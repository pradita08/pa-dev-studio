/**
 * PA DEV Framework — modul sidebar.
 * Drawer mobile (overlay, focus trap, Escape), collapse rail desktop
 * (persist localStorage), dan submenu accordion. Vanilla JS.
 */
'use strict';

(function () {
  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

  function createSidebarSvg(attributes, pathData) {
    const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    Object.entries(attributes).forEach(([name, value]) => svg.setAttribute(name, value));

    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'currentColor');
    path.setAttribute('stroke', 'none');
    svg.append(path);

    return svg;
  }

  function createExpandedConnector(position) {
    const connector = document.createElement('span');
    connector.className = `sidebar-expanded-connector sidebar-expanded-connector-${position}`;
    connector.setAttribute('aria-hidden', 'true');

    const pathData = position === 'top'
      ? 'M12 0 V13 H0 V12 A12 12 0 0 0 12 0 Z'
      : 'M12 13 V0 H0 V1 A12 12 0 0 1 12 13 Z';
    const svg = createSidebarSvg({ viewBox: '0 0 12 13', width: '12', height: '13' }, pathData);
    svg.style.color = 'var(--color-canvas)';
    connector.append(svg);

    return connector;
  }

  function createMiniConnector() {
    const connector = document.createElement('span');
    connector.className = 'sidebar-mini-connector';
    connector.setAttribute('aria-hidden', 'true');

    const svg = createSidebarSvg(
      { viewBox: '0 0 6 30', width: '6', height: '30' },
      'M6 0 L0.32 13.44 A4 4 0 0 0 0.32 16.56 L6 30 Z',
    );
    svg.style.color = 'var(--color-canvas)';
    connector.append(svg);

    return connector;
  }

  /**
   * Mengambil susunan menu milik pengguna dari registry.
   *
   * Dimulai saat berkas ini dibaca, jadi sudah berjalan selagi browser
   * menyelesaikan sisa halaman. Hasilnya ditunggu sekali sebelum sidebar
   * dirender — BUKAN dipakai untuk merender ulang setelahnya.
   *
   * Alasannya penting: dekorasi menu aktif (ikon terisi dan lekukan
   * penghubung) dipasang `enhanceSubmenuParent` saat controller submenu
   * dibuat, dan itu hanya terjadi sekali pada markup yang ada waktu init.
   * Merender ulang sesudahnya menghasilkan markup baru tanpa dekorasi itu.
   */
  const menuRegistry = (async () => {
    try {
      const respons = await fetch('/api/admin/me/menus', { credentials: 'same-origin' });
      if (!respons.ok) return null;
      const { data } = await respons.json();
      if (!Array.isArray(data) || data.length === 0) return null;

      // Registry menyimpan path absolut; perender memakai bentuk relatif
      // untuk menandai halaman yang sedang dibuka.
      const relatif = (p) => (p ? `.${String(p).replace('/adminpanel', '')}` : p);
      return data.map((entri) => {
        if (entri.heading) return entri;
        if (entri.items) return { ...entri, items: entri.items.map((i) => [i.label, relatif(i.path)]) };
        return { ...entri, path: relatif(entri.path) };
      });
    } catch (_) {
      return null;   // sidebar dibiarkan kosong, bukan diisi tebakan
    }
  })();


  function renderCanonicalNavigation(sidebar) {
    const nav = sidebar.querySelector('.sidebar-nav[data-sidebar-canonical="runtime"]');
    if (!nav) return;
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    /**
     * Halaman tambah/edit TIDAK punya entri menunya sendiri — registry hanya
     * menyimpan halaman daftarnya. Tanpa pemetaan ini, membuka
     * padev-users-form.html membuat seluruh sidebar tidak ada yang tersorot
     * dan submenu induknya ikut tertutup.
     *
     * Konvensi repo: `<daftar>-form.html` adalah anak dari `<daftar>.html`,
     * jadi cukup lepas akhiran `-form` untuk menemukan pemiliknya.
     */
    const ownerPage = currentPage.replace(/-form\.html$/, '.html');
    const isActive = (href) => {
      const target = href?.split('#')[0];
      return target === `./${currentPage}` || target === `./${ownerPage}`;
    };
    const icon = (pathData, className = 'h-5 w-5') => `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${pathData}"></path></svg>`;
    /**
     * Sidebar dirakit runtime sehingga tidak pernah tersentuh pemindai i18n
     * statis. Kunci kamus diturunkan dari labelnya: 'Data Display' →
     * nav.data-display, 'User & Access' → nav.group.user-and-access. Kunci yang
     * tidak ada di kamus dibiarkan apa adanya oleh i18n.js, jadi label tanpa
     * terjemahan tetap tampil normal.
     */
    const slug = (text) => String(text).toLowerCase().replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const i18nAttr = (prefix, text) => ` data-i18n="${prefix}${slug(text)}"`;

    const link = ([label, href]) => {
      const active = isActive(href);
      return `<li><a href="${href}" class="sidebar-sublink${active ? ' sidebar-sublink-active' : ''}"${active ? ' aria-current="page"' : ''}><span class="sidebar-dot"></span><span class="sidebar-label flex-1 truncate"${i18nAttr('nav.item.', label)}>${label}</span></a></li>`;
    };
    const group = (entry) => {
      if (entry.heading) return `<li class="sidebar-heading" aria-hidden="true"${i18nAttr('nav.heading.', entry.heading)}>${entry.heading}</li>`;

      // MENU TUNGGAL. Tanpa cabang ini, entri yang tujuannya cuma satu akan
      // dirender sebagai tombol submenu kosong yang tidak bisa diklik ke mana
      // pun. Registry menu di database memakai bentuk ini juga.
      if (entry.path && !entry.items) {
        const active = isActive(entry.path);
        return `<li><a href="${entry.path}" class="sidebar-link${active ? ' sidebar-link-active' : ''}"${active ? ' aria-current="page"' : ''}>${icon(entry.icon)}<span class="sidebar-label flex-1 truncate text-left"${i18nAttr('nav.', entry.label)}>${entry.label}</span></a></li>`;
      }

      const allItems = entry.items || entry.groups?.flatMap(([, items]) => items) || [];
      const active = allItems.some(([, href]) => isActive(href));
      const children = entry.groups
        ? entry.groups.map(([heading, items]) => `<li class="sidebar-subheading" aria-hidden="true"${i18nAttr('nav.group.', heading)}>${heading}</li>${items.map(link).join('')}`).join('')
        : allItems.map(link).join('');
      return `<li><button type="button" class="sidebar-link" data-submenu-toggle aria-label="${entry.label}"${i18nAttr('nav.', entry.label).replace('data-i18n=', 'data-i18n-aria-label=')} aria-expanded="${active ? 'true' : 'false'}">${icon(entry.icon)}<span class="sidebar-label flex-1 truncate text-left"${i18nAttr('nav.', entry.label)}>${entry.label}</span><svg class="sidebar-chevron h-4 w-4 shrink-0 transition-transform duration-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg></button><ul class="sidebar-submenu${active ? '' : ' hidden'}">${children}</ul></li>`;
    };
    // Registry menu dari database bila sudah dimuat; kalau belum, daftar bawaan.
    // M1: registry database adalah SATU-SATUNYA sumber menu. Tidak ada daftar
    // cadangan di kode — daftar seperti itu menjadi sumber hidup kedua yang
    // diam-diam berbeda dari katalog izin.
    const sumber = window.PADEV_NAV;
    if (!Array.isArray(sumber)) return;
    nav.innerHTML = `<ul class="space-y-1">${sumber.map(group).join('')}</ul>`;
    // Markup baru muncul setelah i18n.apply() awal, jadi terjemahkan ulang di sini
    // dan setiap kali bahasa berganti.
    window.PADevI18n?.apply(nav);
    if (!nav.dataset.i18nBound) {
      nav.dataset.i18nBound = 'true';
      // Kedua peristiwa dikirim `document.dispatchEvent` TANPA `bubbles`, jadi
      // tidak pernah sampai ke window. Menyimaknya di window membuat sidebar
      // diam saat bahasa diganti — termasuk kotak pencarian menunya.
      document.addEventListener('padev:locale-change', () => window.PADevI18n?.apply(nav));
      document.addEventListener('padev:locale-ready', () => window.PADevI18n?.apply(nav));
    }
    revealActiveItem(nav);
  }

  /**
   * Bawa item aktif ke dalam viewport nav setelah render.
   * Tanpa ini nav selalu mulai dari posisi paling atas, sehingga submenu yang
   * sedang terbuka berada di luar layar dan setiap perpindahan halaman terasa
   * "melompat ke atas". Menggeser scrollTop nav secara langsung — bukan
   * scrollIntoView — supaya halaman utama tidak ikut ter-scroll.
   */
  function revealActiveItem(nav) {
    const active = nav.querySelector('.sidebar-sublink-active, [aria-current="page"]');
    if (!active) return;
    requestAnimationFrame(() => {
      const navBox = nav.getBoundingClientRect();
      const itemBox = active.getBoundingClientRect();
      if (!navBox.height) return;
      const above = itemBox.top < navBox.top;
      const below = itemBox.bottom > navBox.bottom;
      if (!above && !below) return;
      nav.scrollTop += (itemBox.top - navBox.top) - (navBox.height - itemBox.height) / 2;
    });
  }

  /**
   * Memasang tiga lekukan penyambung pada item sidebar yang sedang aktif.
   *
   * Pill item aktif berwarna canvas dan menyatu dengan area konten di
   * kanannya. Tanpa lekukan ini, sudut kanan-atas dan kanan-bawahnya bertemu
   * latar sidebar dengan sudut siku — terlihat seperti kotak yang ditempel,
   * bukan lidah yang menyambung.
   *
   * Dipakai bersama oleh induk submenu DAN menu tunggal: keduanya memakai pill
   * aktif yang sama, jadi keduanya butuh sambungan yang sama. CSS-nya sudah
   * menyiapkan keduanya (`.sidebar-link-active > .sidebar-mini-connector`);
   * sebelumnya hanya induk submenu yang benar-benar dipasangi.
   */
  function attachActiveConnectors(item) {
    if (!item.querySelector(':scope > .sidebar-expanded-connector-top')) {
      item.append(createExpandedConnector('top'));
    }
    if (!item.querySelector(':scope > .sidebar-expanded-connector-bottom')) {
      item.append(createExpandedConnector('bottom'));
    }
    if (!item.querySelector(':scope > .sidebar-mini-connector')) {
      item.append(createMiniConnector());
    }
  }

  function enhanceSubmenuParent(toggle) {
    const outlineIcon = Array.from(toggle.children).find((child) => (
      child.tagName.toLowerCase() === 'svg'
      && !child.classList.contains('sidebar-chevron')
      && !child.classList.contains('sidebar-active-icon-filled')
    ));

    if (outlineIcon) outlineIcon.classList.add('sidebar-active-icon-outline');

    const currentFilledIcon = toggle.querySelector(':scope > .sidebar-active-icon-filled');
    const filledIcon = createSidebarSvg(
      {
        viewBox: '0 0 24 24',
        class: 'sidebar-active-icon-filled',
        'aria-hidden': 'true',
      },
      'M12.378 1.602a.75.75 0 0 0-.756 0L3.366 6.13 12 10.866l8.634-4.736-8.256-4.528ZM21.75 7.429l-9 4.936v10.073l8.628-4.736a.75.75 0 0 0 .372-.648V7.429ZM11.25 22.438V12.365l-9-4.936v9.625a.75.75 0 0 0 .372.648l8.628 4.736Z',
    );

    if (currentFilledIcon) currentFilledIcon.replaceWith(filledIcon);
    else if (outlineIcon) outlineIcon.insertAdjacentElement('afterend', filledIcon);
    else toggle.prepend(filledIcon);

    attachActiveConnectors(toggle);
  }

  function createSidebarMenuSearch(nav, menuList) {
    const existing = nav.querySelector('[data-sidebar-menu-search]');
    if (existing) {
      return {
        input: existing.querySelector('input[type="search"]'),
        status: existing.querySelector('[aria-live]'),
      };
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'sidebar-menu-search';
    wrapper.dataset.sidebarMenuSearch = '';
    wrapper.setAttribute('role', 'search');

    const inputId = 'sidebar-menu-search-input';
    const listId = menuList.id || 'sidebar-menu-list';
    menuList.id = listId;

    const label = document.createElement('label');
    label.className = 'sr-only';
    label.htmlFor = inputId;
    label.textContent = 'Cari menu navigasi';
    label.dataset.i18n = 'sidebar.searchMenu';

    const icon = document.createElementNS(SVG_NAMESPACE, 'svg');
    icon.setAttribute('class', 'sidebar-menu-search-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    icon.setAttribute('stroke-linecap', 'round');
    icon.setAttribute('aria-hidden', 'true');
    const circle = document.createElementNS(SVG_NAMESPACE, 'circle');
    circle.setAttribute('cx', '11');
    circle.setAttribute('cy', '11');
    circle.setAttribute('r', '7');
    const handle = document.createElementNS(SVG_NAMESPACE, 'path');
    handle.setAttribute('d', 'm20 20-4-4');
    icon.append(circle, handle);

    const input = document.createElement('input');
    input.id = inputId;
    input.className = 'sidebar-menu-search-input';
    input.type = 'search';
    input.placeholder = 'Cari menu...';
    // Kotak ini dibangun runtime, jadi pemindai i18n statis tidak pernah
    // melihatnya. Kuncinya sudah lama ada di kamus; yang belum ada hanya
    // atribut penghubungnya, sehingga placeholder-nya tetap Indonesia
    // meski bahasa panel diganti.
    input.dataset.i18nPlaceholder = 'sidebar.searchMenu';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('aria-controls', listId);

    const status = document.createElement('span');
    status.className = 'sr-only';
    status.setAttribute('aria-live', 'polite');

    wrapper.append(label, icon, input, status);
    nav.insertBefore(wrapper, menuList);
    // Dipasang setelah apply() awal pada nav, jadi perlu diterjemahkan sendiri.
    window.PADevI18n?.apply(wrapper);

    return { input, status };
  }

  function initSidebar() {
    const shell = document.querySelector('.app-shell');
    const sidebar = document.querySelector('[data-sidebar]');
    if (!shell || !sidebar) return;

    renderCanonicalNavigation(sidebar);

    const overlay = document.querySelector('[data-sidebar-overlay]');
    const openBtn = document.querySelector('[data-drawer-open]');
    const closeBtn = sidebar.querySelector('[data-drawer-close]');
    const desktopMedia = window.matchMedia('(min-width: 1024px)');
    let lastFocused = null;

    const isDrawerOpen = () => shell.dataset.drawer === 'open';
    const getVisibleFocusables = () => Array.from(sidebar.querySelectorAll(FOCUSABLE))
      .filter((element) => element.offsetParent !== null);

    function openDrawer() {
      lastFocused = document.activeElement;
      shell.dataset.drawer = 'open';
      if (overlay) overlay.classList.remove('hidden');
      document.body.classList.add('overflow-hidden', 'lg:overflow-auto');
      if (openBtn) openBtn.setAttribute('aria-expanded', 'true');
      const [first] = getVisibleFocusables();
      if (first) first.focus();
    }

    function closeDrawer() {
      shell.dataset.drawer = 'closed';
      if (overlay) overlay.classList.add('hidden');
      document.body.classList.remove('overflow-hidden', 'lg:overflow-auto');
      if (openBtn) {
        openBtn.setAttribute('aria-expanded', 'false');
        if (lastFocused) lastFocused.focus();
      }
    }

    if (openBtn) openBtn.addEventListener('click', openDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);

    // Escape menutup drawer; Tab terkunci di dalam sidebar saat drawer terbuka.
    document.addEventListener('keydown', (event) => {
      if (!isDrawerOpen() || desktopMedia.matches) return;

      if (event.key === 'Escape') {
        closeDrawer();
        return;
      }

      if (event.key === 'Tab') {
        const focusables = getVisibleFocusables();
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (!sidebar.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    const submenuControllers = [];
    let activeFlyoutController = null;
    let flyoutCloseTimer = null;

    const isRailMode = () => desktopMedia.matches && shell.dataset.collapsed === 'true';
    const clearFlyoutCloseTimer = () => {
      if (flyoutCloseTimer) window.clearTimeout(flyoutCloseTimer);
      flyoutCloseTimer = null;
    };
    const scheduleFlyoutClose = (controller) => {
      clearFlyoutCloseTimer();
      flyoutCloseTimer = window.setTimeout(() => {
        if (activeFlyoutController === controller) controller.closeFlyout();
      }, 160);
    };

    function createSubmenuController(toggle, index) {
      enhanceSubmenuParent(toggle);

      const submenu = toggle.nextElementSibling;
      if (!submenu?.classList.contains('sidebar-submenu')) return null;

      const chevron = toggle.querySelector('.sidebar-chevron');
      const origin = document.createComment('sidebar-submenu-origin');
      const parentActive = Boolean(submenu.querySelector('[aria-current="page"], .sidebar-sublink-active'));
      let expandedOpen = parentActive || toggle.getAttribute('aria-expanded') === 'true';
      let searchOpen = false;
      let flyoutOpen = false;
      let controller = null;

      submenu.before(origin);
      if (!submenu.id) submenu.id = `sidebar-submenu-${index + 1}`;
      toggle.setAttribute('aria-controls', submenu.id);
      toggle.dataset.parentActive = String(parentActive);

      const getFlyoutItems = () => Array.from(submenu.querySelectorAll(
        'a[href]:not([aria-disabled="true"]):not([tabindex="-1"])',
      ));

      function restoreSubmenu() {
        submenu.classList.add('hidden');
        delete submenu.dataset.sidebarFlyout;
        submenu.style.removeProperty('top');
        submenu.style.removeProperty('left');
        if (origin.isConnected) origin.after(submenu);
      }

      function applyExpandedState() {
        const disclosureOpen = expandedOpen || searchOpen;
        restoreSubmenu();
        toggle.setAttribute('aria-expanded', String(disclosureOpen));
        submenu.classList.toggle('hidden', !disclosureOpen);
        if (chevron) chevron.classList.toggle('rotate-180', disclosureOpen);
      }

      function positionFlyout() {
        if (!flyoutOpen) return;
        const triggerRect = toggle.getBoundingClientRect();
        const sidebarRect = sidebar.getBoundingClientRect();
        const maxTop = Math.max(12, window.innerHeight - submenu.offsetHeight - 12);
        submenu.style.top = `${Math.min(Math.max(12, triggerRect.top), maxTop)}px`;
        submenu.style.left = `${sidebarRect.right + 8}px`;
      }

      function closeFlyout(restoreFocus = false) {
        clearFlyoutCloseTimer();
        flyoutOpen = false;
        restoreSubmenu();
        if (activeFlyoutController === controller) activeFlyoutController = null;

        if (isRailMode()) {
          toggle.setAttribute('aria-expanded', 'false');
          if (chevron) chevron.classList.remove('rotate-180');
        } else {
          const disclosureOpen = expandedOpen || searchOpen;
          toggle.setAttribute('aria-expanded', String(disclosureOpen));
          submenu.classList.toggle('hidden', !disclosureOpen);
          if (chevron) chevron.classList.toggle('rotate-180', disclosureOpen);
        }

        if (restoreFocus) toggle.focus();
      }

      function openFlyout(focusFirst = false) {
        if (!isRailMode()) return;
        clearFlyoutCloseTimer();
        if (activeFlyoutController && activeFlyoutController !== controller) {
          activeFlyoutController.closeFlyout();
        }

        restoreSubmenu();
        document.body.append(submenu);
        submenu.dataset.sidebarFlyout = 'true';
        submenu.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
        flyoutOpen = true;
        activeFlyoutController = controller;
        positionFlyout();

        if (focusFirst) {
          window.requestAnimationFrame(() => getFlyoutItems()[0]?.focus());
        }
      }

      function syncMode() {
        if (isRailMode()) closeFlyout();
        else applyExpandedState();
      }

      function setSearchOpen(open) {
        searchOpen = open;
        if (!isRailMode()) applyExpandedState();
      }

      controller = {
        closeFlyout,
        isFlyoutOpen: () => flyoutOpen,
        positionFlyout,
        setSearchOpen,
        submenu,
        syncMode,
        toggle,
      };

      toggle.addEventListener('click', () => {
        if (isRailMode()) {
          openFlyout();
          return;
        }

        expandedOpen = !expandedOpen;
        applyExpandedState();
      });

      toggle.addEventListener('keydown', (event) => {
        if (!isRailMode()) return;

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          openFlyout(true);
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openFlyout();
        }
      });

      toggle.addEventListener('mouseenter', () => {
        if (isRailMode()) openFlyout();
      });
      toggle.addEventListener('mouseleave', () => {
        if (isRailMode()) scheduleFlyoutClose(controller);
      });
      submenu.addEventListener('mouseenter', clearFlyoutCloseTimer);
      submenu.addEventListener('mouseleave', () => {
        if (isRailMode()) scheduleFlyoutClose(controller);
      });

      submenu.addEventListener('keydown', (event) => {
        if (!flyoutOpen || !['ArrowDown', 'ArrowUp'].includes(event.key)) return;
        const items = getFlyoutItems();
        const currentIndex = items.indexOf(document.activeElement);
        if (currentIndex < 0 || items.length === 0) return;
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        items[(currentIndex + direction + items.length) % items.length].focus();
      });

      syncMode();
      return controller;
    }

    sidebar.querySelectorAll('[data-submenu-toggle]').forEach((toggle, index) => {
      const controller = createSubmenuController(toggle, index);
      if (controller) submenuControllers.push(controller);
    });

    // Menu tunggal yang sedang dibuka: pill-nya sama dengan induk submenu aktif,
    // jadi sambungannya juga harus sama. Tanpa ini sudut kanannya siku.
    sidebar.querySelectorAll('a.sidebar-link-active').forEach(attachActiveConnectors);

    const nav = sidebar.querySelector('.sidebar-nav');
    const menuList = nav?.querySelector(':scope > ul');
    let menuSearchController = null;

    if (nav && menuList) {
      const searchElements = createSidebarMenuSearch(nav, menuList);
      const menuItems = Array.from(menuList.children).filter((item) => item.tagName === 'LI');
      const controllerByToggle = new Map(submenuControllers.map((controller) => [controller.toggle, controller]));
      const normalizeLabel = (value) => value.trim().toLocaleLowerCase('id-ID');
      const getLabel = (element) => normalizeLabel(
        element.querySelector('.sidebar-label')?.textContent || element.getAttribute('aria-label') || '',
      );

      function applyMenuSearch(rawQuery) {
        const query = normalizeLabel(rawQuery);
        const searching = query.length > 0;
        let resultCount = 0;

        menuItems.forEach((item) => {
          const trigger = Array.from(item.children).find((child) => child.classList?.contains('sidebar-link'));
          if (!trigger) return;

          const controller = controllerByToggle.get(trigger);
          const parentMatches = searching && getLabel(trigger).includes(query);

          if (controller) {
            const childItems = Array.from(controller.submenu.children).filter((child) => child.tagName === 'LI');
            let childMatchCount = 0;

            childItems.forEach((childItem) => {
              const childLink = childItem.querySelector('.sidebar-sublink');
              const childMatches = parentMatches || Boolean(childLink && getLabel(childLink).includes(query));
              childItem.classList.toggle('sidebar-search-hidden', searching && !childMatches);
              if (searching && childMatches) childMatchCount += 1;
            });

            const groupMatches = !searching || parentMatches || childMatchCount > 0;
            item.classList.toggle('sidebar-search-hidden', !groupMatches);
            controller.setSearchOpen(searching && groupMatches);
            if (searching && groupMatches) resultCount += parentMatches ? 1 : childMatchCount;
            return;
          }

          const matches = !searching || getLabel(trigger).includes(query);
          item.classList.toggle('sidebar-search-hidden', !matches);
          if (searching && matches) resultCount += 1;
        });

        if (searchElements.status) {
          // Pengumuman pembaca layar ikut bahasa panel; kuncinya sudah ada di
          // kamus dan `{n}` diisi oleh t().
          searchElements.status.textContent = searching
            ? (window.PADevI18n?.t('sidebar.menuFound', { n: resultCount }) ?? `${resultCount} menu ditemukan`)
            : (window.PADevI18n?.t('sidebar.menuAll') ?? 'Semua menu ditampilkan');
        }
      }

      searchElements.input?.addEventListener('input', (event) => {
        applyMenuSearch(event.currentTarget.value);
      });

      searchElements.input?.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && event.currentTarget.value) {
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.value = '';
          applyMenuSearch('');
          return;
        }

        if (event.key !== 'ArrowDown') return;
        const firstVisible = Array.from(menuList.querySelectorAll('.sidebar-link, .sidebar-sublink'))
          .find((link) => (
            !link.closest('li')?.classList.contains('sidebar-search-hidden')
            && link.getAttribute('aria-disabled') !== 'true'
            && link.getAttribute('tabindex') !== '-1'
          ));
        if (firstVisible) {
          event.preventDefault();
          firstVisible.focus();
        }
      });

      menuSearchController = {
        reset() {
          if (searchElements.input) searchElements.input.value = '';
          applyMenuSearch('');
        },
      };

      applyMenuSearch('');
    }

    // Collapse desktop (rail ikon) + persist preferensi.
    const collapseBtn = sidebar.querySelector('[data-collapse-toggle]');

    function setCollapsed(collapsed) {
      shell.dataset.collapsed = String(collapsed);
      if (collapseBtn) {
        collapseBtn.setAttribute('aria-pressed', String(collapsed));
        const icon = collapseBtn.querySelector('svg');
        if (icon) icon.classList.toggle('rotate-180', collapsed);
      }
      if (collapsed) menuSearchController?.reset();
      submenuControllers.forEach((controller) => controller.syncMode());
      try {
        localStorage.setItem('padev.sidebar.collapsed', String(collapsed));
      } catch (_) { /* storage tidak tersedia — abaikan */ }
    }

    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        setCollapsed(shell.dataset.collapsed !== 'true');
      });
    }

    try {
      if (localStorage.getItem('padev.sidebar.collapsed') === 'true') setCollapsed(true);
    } catch (_) { /* abaikan */ }

    document.addEventListener('pointerdown', (event) => {
      if (!activeFlyoutController) return;
      const activeToggle = sidebar.querySelector('[data-submenu-toggle][aria-expanded="true"]');
      const activeSubmenu = document.querySelector('.sidebar-submenu[data-sidebar-flyout="true"]');
      if (activeToggle?.contains(event.target) || activeSubmenu?.contains(event.target)) return;
      activeFlyoutController.closeFlyout();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !activeFlyoutController) return;
      event.preventDefault();
      activeFlyoutController.closeFlyout(true);
    });

    const repositionFlyout = () => activeFlyoutController?.positionFlyout();
    window.addEventListener('resize', repositionFlyout);
    sidebar.querySelector('.sidebar-nav')?.addEventListener('scroll', repositionFlyout);
    desktopMedia.addEventListener('change', () => {
      submenuControllers.forEach((controller) => controller.syncMode());
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    window.PADEV_NAV = await menuRegistry;
    initSidebar();
  });
})();
