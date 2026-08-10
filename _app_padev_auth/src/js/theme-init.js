/**
 * PA DEV theme-init — dijalankan blocking di <head> agar preferensi tersimpan
 * diterapkan SEBELUM first paint: tanpa flash tema/appearance/layout.
 * Key: padev.theme, padev.appearance, padev.layout (fallback ke preferensi lama).
 */
(function () {
  'use strict';
  var html = document.documentElement;
  var get = function (key) {
    try { return window.localStorage.getItem(key); } catch (_) { return null; }
  };

  var THEMES = ['arctic-glass', 'ocean-deep', 'sandstone', 'obsidian-gold', 'lavender-frost', 'forest-paper', 'graphite', 'sapphire', 'emerald', 'royal', 'crimson', 'carbon'];
  var theme = get('padev.theme');
  html.dataset.padevTheme = THEMES.indexOf(theme) !== -1 ? theme : 'arctic-glass';

  var appearance = get('padev.appearance');
  if (['light', 'dark', 'system'].indexOf(appearance) === -1) {
    try {
      var legacy = JSON.parse(get('padev.theme.preferences.v1') || '{}');
      appearance = ['light', 'dark', 'system'].indexOf(legacy.theme) !== -1 ? legacy.theme : 'light';
    } catch (_) { appearance = 'light'; }
  }
  var resolved = appearance === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : appearance;
  html.dataset.paTheme = resolved;
  html.dataset.padevAppearance = appearance;

  var layout = get('padev.layout');
  html.dataset.padevLayout = layout === 'full' ? 'full' : 'boxed';
})();
