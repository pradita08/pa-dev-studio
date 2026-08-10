/**
 * PA DEV Theme Customizer — panel pengaturan tema global (di-inject runtime,
 * satu sumber markup untuk semua halaman).
 *
 * Fitur   : 12 tema builtin, appearance light/dark/system, layout sidebar
 *           expanded/minimized + boxed/full width, reset ke default.
 * Token   : mengubah html[data-padev-theme|data-pa-theme|data-padev-layout];
 *           seluruh warna mengikuti CSS variables — tanpa reload/rebuild.
 * Persist : padev.theme, padev.appearance, padev.layout, padev.sidebar
 *           (+ key existing padev.sidebar.collapsed & preferensi lama agar
 *           halaman Theme Switch tetap konsisten).
 */
(() => {
  'use strict';

  const KEYS = { theme: 'padev.theme', appearance: 'padev.appearance', layout: 'padev.layout', sidebar: 'padev.sidebar' };
  const LEGACY = 'padev.theme.preferences.v1';
  const THEMES = [
    { id: 'arctic-glass', label: 'Arctic Glass', stops: ['#F8FAFC', '#DCE5EE'], primary: '#2563EB' },
    { id: 'ocean-deep', label: 'Ocean Deep', stops: ['#06222E', '#14485D'], primary: '#06B6D4' },
    { id: 'sandstone', label: 'Sandstone', stops: ['#F7F3EC', '#E2D6C4'], primary: '#B45309' },
    { id: 'obsidian-gold', label: 'Obsidian Gold', stops: ['#101014', '#24242E'], primary: '#D4A72C' },
    { id: 'lavender-frost', label: 'Lavender Frost', stops: ['#F6F4FB', '#DCD5EC'], primary: '#7C3AED' },
    { id: 'forest-paper', label: 'Forest Paper', stops: ['#F4F6F0', '#D9E1CB'], primary: '#2F7D4F' },
    { id: 'graphite', label: 'Titanium Graphite', stops: ['#262B36', '#394253'], primary: '#F59E0B' },
    { id: 'sapphire', label: 'Sapphire Blue', stops: ['#1E3A8A', '#3160C8'], primary: '#3B82F6' },
    { id: 'emerald', label: 'Emerald Forest', stops: ['#163A2D', '#2C7865'], primary: '#10B981' },
    { id: 'royal', label: 'Royal Purple', stops: ['#312E81', '#564FC7'], primary: '#8B5CF6' },
    { id: 'crimson', label: 'Crimson Wine', stops: ['#4A1F2D', '#7C3E54'], primary: '#E11D48' },
    { id: 'carbon', label: 'Carbon Black', stops: ['#1B1D22', '#313946'], primary: '#0EA5E9' },
  ];
  const html = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

  const store = (key, value) => { try { window.localStorage.setItem(key, value); } catch (_) { /* abaikan */ } };
  const drop = (key) => { try { window.localStorage.removeItem(key); } catch (_) { /* abaikan */ } };

  const state = {
    theme: html.dataset.padevTheme || 'arctic-glass',
    appearance: html.dataset.padevAppearance || 'light',
    layout: html.dataset.padevLayout || 'boxed',
    sidebar: document.querySelector('.app-shell')?.dataset.collapsed === 'true' ? 'minimized' : 'expanded',
  };

  function applyTheme(persist = true) {
    html.dataset.padevTheme = state.theme;
    if (persist) store(KEYS.theme, state.theme);
  }

  function applyAppearance(persist = true) {
    const resolved = state.appearance === 'system' ? (systemDark.matches ? 'dark' : 'light') : state.appearance;
    html.dataset.paTheme = resolved;
    html.dataset.padevAppearance = state.appearance;
    if (persist) {
      store(KEYS.appearance, state.appearance);
      // Selaraskan dengan mekanisme lama (halaman Theme Switch & app.js).
      let legacy = {};
      try { legacy = JSON.parse(window.localStorage.getItem(LEGACY)) || {}; } catch (_) { /* abaikan */ }
      store(LEGACY, JSON.stringify({ theme: state.appearance, preset: legacy.preset || 'padev', density: legacy.density || 'comfortable' }));
    }
  }

  function applyLayout(persist = true) {
    html.dataset.padevLayout = state.layout;
    if (persist) store(KEYS.layout, state.layout);
  }

  function applySidebar(persist = true) {
    const shell = document.querySelector('.app-shell');
    if (shell) {
      const collapse = state.sidebar === 'minimized';
      if ((shell.dataset.collapsed === 'true') !== collapse) {
        const toggle = document.querySelector('[data-collapse-toggle]');
        if (toggle) toggle.click(); // reuse mekanisme sidebar existing (incl. persist-nya)
        else shell.dataset.collapsed = String(collapse);
      }
    }
    if (persist) {
      store(KEYS.sidebar, state.sidebar);
      store('padev.sidebar.collapsed', String(state.sidebar === 'minimized'));
    }
  }

  systemDark.addEventListener('change', () => { if (state.appearance === 'system') applyAppearance(false); });

  /* ---------- Markup (single source, injected) ---------- */
  const ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="width:1.1rem;height:1.1rem"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  const option = (group, value, label, key) => `<button type="button" class="pa-customizer-option" data-pa-option="${group}" data-pa-value="${value}" aria-pressed="false"${key ? ` data-i18n="${key}"` : ''}>${label}</button>`;

  const markup = `
    <button type="button" class="pa-customizer-trigger" data-pa-open aria-haspopup="dialog" aria-expanded="false" aria-label="Open Theme Customizer" data-i18n-aria-label="customizer.open">${ICON}</button>
    <div class="pa-customizer-backdrop" data-pa-backdrop></div>
    <aside class="pa-customizer-panel" role="dialog" aria-modal="true" aria-labelledby="pa-customizer-title" tabindex="-1">
      <div class="pa-customizer-head">
        <h2 id="pa-customizer-title" class="pa-customizer-title" data-i18n="customizer.title">Theme Customizer</h2>
        <button type="button" class="pa-customizer-close" data-pa-close aria-label="Close Theme Customizer" data-i18n-aria-label="customizer.close">${CLOSE}</button>
      </div>
      <div class="pa-customizer-body">
        <section class="pa-customizer-section" aria-label="Theme" data-i18n-aria-label="customizer.theme">
          <h3 data-i18n="customizer.theme">Theme</h3>
          <div class="pa-customizer-themes" role="group" aria-label="Choose theme" data-i18n-aria-label="customizer.chooseTheme">
            ${THEMES.map((t) => `<button type="button" class="pa-customizer-theme" data-pa-option="theme" data-pa-value="${t.id}" aria-pressed="false" aria-label="${t.label}">
              <span class="pa-customizer-swatch" style="background:linear-gradient(160deg, ${t.stops[0]}, ${t.stops[1]})"><i style="background:${t.primary}"></i></span>
              <span>${t.label}</span>
            </button>`).join('')}
          </div>
        </section>
        <section class="pa-customizer-section" aria-label="Appearance" data-i18n-aria-label="customizer.appearance">
          <h3 data-i18n="customizer.appearance">Appearance</h3>
          <div class="pa-customizer-options" data-columns="2" role="group" aria-label="Choose appearance" data-i18n-aria-label="customizer.chooseAppearance">
            ${option('appearance', 'light', 'Light', 'theme.light')}
            ${option('appearance', 'dark', 'Dark', 'theme.dark')}
            ${option('appearance', 'system', 'System', 'theme.system')}
          </div>
        </section>
        <section class="pa-customizer-section" aria-label="Layout" data-i18n-aria-label="customizer.layout">
          <h3 data-i18n="customizer.layout">Layout</h3>
          <div class="pa-customizer-options" data-columns="2" role="group" aria-label="Choose layout" data-i18n-aria-label="customizer.chooseLayout">
            ${option('sidebar', 'expanded', 'Sidebar Expanded', 'customizer.sidebarExpanded')}
            ${option('sidebar', 'minimized', 'Sidebar Minimized', 'customizer.sidebarMinimized')}
            ${option('layout', 'boxed', 'Boxed Layout', 'customizer.boxedLayout')}
            ${option('layout', 'full', 'Full Width', 'customizer.fullWidth')}
          </div>
        </section>
      </div>
      <div class="pa-customizer-foot">
        <button type="button" class="ui-button ui-button--outline ui-button--full" data-pa-reset data-i18n="customizer.reset">Reset to Default</button>
      </div>
    </aside>`;

  document.addEventListener('DOMContentLoaded', () => {
    const rootEl = document.createElement('div');
    rootEl.className = 'pa-customizer';
    rootEl.dataset.open = 'false';
    rootEl.innerHTML = markup;
    document.body.append(rootEl);
    window.PADevI18n?.apply?.(rootEl);
    const applyCustomizerLocale = () => window.PADevI18n?.apply?.(rootEl);
    document.addEventListener('padev:locale-change', applyCustomizerLocale);
    document.addEventListener('padev:locale-ready', applyCustomizerLocale);

    const trigger = rootEl.querySelector('[data-pa-open]');
    const panel = rootEl.querySelector('.pa-customizer-panel');
    let lastFocused = null;

    const syncButtons = () => {
      rootEl.querySelectorAll('[data-pa-option]').forEach((button) => {
        const group = button.dataset.paOption;
        button.setAttribute('aria-pressed', String(state[group] === button.dataset.paValue));
      });
    };

    const setOpen = (open) => {
      rootEl.dataset.open = String(open);
      trigger.setAttribute('aria-expanded', String(open));
      if (open) {
        lastFocused = document.activeElement;
        // Sinkron dengan state shell terkini (mis. collapse via tombol sidebar).
        state.sidebar = document.querySelector('.app-shell')?.dataset.collapsed === 'true' ? 'minimized' : 'expanded';
        syncButtons();
        panel.focus();
      } else if (lastFocused) {
        lastFocused.focus();
      }
    };

    trigger.addEventListener('click', () => setOpen(rootEl.dataset.open !== 'true'));

    /* Tombol tema di navbar adalah pintasan terang/gelap, bukan pembuka
     * customizer (panel lengkap tetap lewat trigger mengambang). Ikonnya
     * mengikuti state: bulan saat terang (klik -> gelap), matahari saat gelap. */
    const MOON = '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>';
    const SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>';
    const themeButtons = [...document.querySelectorAll('[data-theme-toggle]')];

    const syncThemeButtons = () => {
      const dark = html.dataset.paTheme === 'dark';
      themeButtons.forEach((button) => {
        const svg = button.querySelector('svg');
        if (svg) svg.innerHTML = dark ? SUN : MOON;
        button.setAttribute('aria-pressed', String(dark));
        const key = dark ? 'navbar.themeLight' : 'navbar.themeDark';
        button.setAttribute('data-i18n-aria-label', key);
        const label = window.PADevI18n?.t?.(key);
        if (label) button.setAttribute('aria-label', label);
      });
    };

    themeButtons.forEach((button) => button.addEventListener('click', () => {
      state.appearance = html.dataset.paTheme === 'dark' ? 'light' : 'dark';
      applyAppearance();
      syncButtons();
      syncThemeButtons();
    }));

    syncThemeButtons();
    document.addEventListener('padev:locale-change', syncThemeButtons);
    systemDark.addEventListener?.('change', syncThemeButtons);
    rootEl.querySelector('[data-pa-close]').addEventListener('click', () => setOpen(false));
    rootEl.querySelector('[data-pa-backdrop]').addEventListener('click', () => setOpen(false));
    panel.addEventListener('keydown', (event) => { if (event.key === 'Escape') setOpen(false); });

    rootEl.addEventListener('click', (event) => {
      const button = event.target.closest('[data-pa-option]');
      if (!button) return;
      const group = button.dataset.paOption;
      state[group] = button.dataset.paValue;
      if (group === 'theme') applyTheme();
      else if (group === 'appearance') applyAppearance();
      else if (group === 'layout') applyLayout();
      else if (group === 'sidebar') applySidebar();
      syncButtons();
    });

    rootEl.querySelector('[data-pa-reset]').addEventListener('click', () => {
      state.theme = 'arctic-glass';
      state.appearance = 'light';
      state.layout = 'boxed';
      state.sidebar = 'expanded';
      applyTheme(false); applyAppearance(false); applyLayout(false); applySidebar(false);
      Object.values(KEYS).forEach(drop);
      drop('padev.sidebar.collapsed');
      drop(LEGACY);
      syncButtons();
    });

    syncButtons();
    window.PADevThemeCustomizer = Object.freeze({
      version: '1.0.0',
      open: () => setOpen(true),
      close: () => setOpen(false),
      themes: Object.freeze(THEMES.map((t) => t.id)),
    });
  });
})();
