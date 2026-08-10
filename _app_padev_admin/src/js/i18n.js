/**
 * PA DEV i18n — sistem bahasa ringan tanpa library eksternal.
 *
 * Bahasa    : en (default & fallback), id, ms.
 * Deteksi   : preferensi tersimpan (localStorage `padev.locale`) menang;
 *             tanpa preferensi, navigator.languages dipetakan id-* → id,
 *             ms-* → ms, selain itu en.
 * Deklaratif: `data-i18n` (textContent), `data-i18n-placeholder`,
 *             `data-i18n-aria-label`, `data-i18n-title`.
 *             Key yang tidak ada di kamus mana pun dibiarkan apa adanya.
 * Interpolasi: t('form.minLength', { n: 8 }) mengganti token {n}.
 * Event     : `padev:locale-change` setelah bahasa berganti dan
 *             `padev:locale-ready` setelah kamus selesai dimuat.
 * API publik: window.PADevI18n — version, t(key, params), setLocale(code),
 *             getLocale(), register(code, dict), apply(root), supported.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'padev.locale';
  const SUPPORTED = ['en', 'id', 'ms'];
  const FALLBACK = 'en';
  const locales = {};
  const loaded = new Set();

  const readStored = () => {
    try {
      const value = window.localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.includes(value) ? value : null;
    } catch (_) { return null; }
  };

  const detectLocale = () => {
    const preferred = readStored();
    if (preferred) return preferred;
    for (const tag of navigator.languages || [navigator.language || '']) {
      const code = String(tag).toLowerCase();
      if (code === 'id' || code.startsWith('id-')) return 'id';
      if (code === 'ms' || code.startsWith('ms-')) return 'ms';
    }
    return FALLBACK;
  };

  let active = detectLocale();

  const interpolate = (text, params) => (params
    ? text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match))
    : text);

  const t = (key, params) => {
    const value = locales[active]?.[key] ?? locales[FALLBACK]?.[key];
    return value == null ? null : interpolate(value, params);
  };

  const ATTRIBUTE_MAP = [
    ['data-i18n', (el, text) => { el.textContent = text; }],
    ['data-i18n-placeholder', (el, text) => { el.setAttribute('placeholder', text); }],
    ['data-i18n-aria-label', (el, text) => { el.setAttribute('aria-label', text); }],
    ['data-i18n-title', (el, text) => { el.setAttribute('title', text); }],
  ];

  const apply = (root = document) => {
    ATTRIBUTE_MAP.forEach(([attribute, write]) => {
      root.querySelectorAll(`[${attribute}]`).forEach((element) => {
        const text = t(element.getAttribute(attribute));
        if (text != null) write(element, text);
      });
    });
    document.documentElement.lang = active;
    document.querySelectorAll('[data-locale-choice]').forEach((choice) => {
      choice.setAttribute('aria-checked', String(choice.dataset.localeChoice === active));
    });
  };

  const loadLocale = (code) => {
    if (!SUPPORTED.includes(code) || loaded.has(code)) return;
    loaded.add(code);
    const script = document.createElement('script');
    script.src = `./assets/js/locales/${code}.js`;
    script.async = false;
    document.head.append(script);
  };

  const register = (code, dictionary) => {
    locales[code] = Object.assign(locales[code] || {}, dictionary);
    if (code === active || code === FALLBACK) {
      apply();
      document.dispatchEvent(new CustomEvent('padev:locale-ready', { detail: { locale: code } }));
    }
  };

  const setLocale = (code) => {
    if (!SUPPORTED.includes(code)) return;
    active = code;
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch (_) { /* opsional */ }
    loadLocale(code);
    apply();
    document.dispatchEvent(new CustomEvent('padev:locale-change', { detail: { locale: code } }));
  };

  window.PADevI18n = Object.freeze({
    version: '1.0.0',
    supported: Object.freeze([...SUPPORTED]),
    t,
    getLocale: () => active,
    setLocale,
    register,
    apply,
  });

  loadLocale(FALLBACK);
  if (active !== FALLBACK) loadLocale(active);

  document.addEventListener('DOMContentLoaded', () => {
    apply();
    document.querySelectorAll('[data-locale-choice]').forEach((choice) => {
      choice.addEventListener('click', () => setLocale(choice.dataset.localeChoice));
    });
  });
})();
