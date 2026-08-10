/**
 * PA DEV Admin Theme — Vanilla JS progressive enhancement
 * Entry point JavaScript ringan (vanilla, tanpa framework).
 * Modul sidebar terpisah di sidebar.js; di sini: dropdown & placeholder.
 */
'use strict';

/* ---------- Dropdown (notifikasi, profil) ---------- */

function initDropdowns() {
  const dropdowns = Array.from(document.querySelectorAll('[data-dropdown]'));
  if (dropdowns.length === 0) return;

  function getMenuItems(panel) {
    return Array.from(panel.querySelectorAll('[role="menuitem"]'))
      .filter((item) => !item.hidden && item.getAttribute('aria-disabled') !== 'true');
  }

  function setOpen(dropdown, isOpen, options = {}) {
    const panel = dropdown.querySelector('[data-dropdown-panel]');
    const toggle = dropdown.querySelector('[data-dropdown-toggle]');
    if (!panel || !toggle) return;

    panel.dataset.open = String(isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen));

    if (isOpen && options.focusFirst) {
      getMenuItems(panel)[0]?.focus();
    }

    if (!isOpen && options.restoreFocus) {
      toggle.focus();
    }
  }

  function closeAll(except, restoreFocus = false) {
    dropdowns.forEach((dropdown) => {
      if (dropdown === except) return;
      const panel = dropdown.querySelector('[data-dropdown-panel]');
      const wasOpen = panel?.dataset.open === 'true';
      setOpen(dropdown, false, { restoreFocus: restoreFocus && wasOpen });
    });
  }

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector('[data-dropdown-toggle]');
    const panel = dropdown.querySelector('[data-dropdown-panel]');
    if (!toggle || !panel) return;

    toggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = panel.dataset.open === 'true';
      closeAll(dropdown);
      setOpen(dropdown, !isOpen);
    });

    toggle.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowDown') return;
      event.preventDefault();
      closeAll(dropdown);
      setOpen(dropdown, true, { focusFirst: true });
    });

    panel.addEventListener('keydown', (event) => {
      const items = getMenuItems(panel);
      if (items.length === 0) return;

      const currentIndex = items.indexOf(document.activeElement);
      let nextIndex = currentIndex;

      if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length;
      else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = items.length - 1;
      else if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(dropdown, false, { restoreFocus: true });
        return;
      } else return;

      event.preventDefault();
      items[nextIndex]?.focus();
    });
  });

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-dropdown]')) closeAll(null);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeAll(null, true);
  });
}

/* ---------- Placeholder link (fitur fase berikutnya) ---------- */

function initPlaceholders() {
  document.addEventListener('click', (event) => {
    const placeholder = event.target.closest('[data-placeholder]');
    if (placeholder) event.preventDefault();
  });
}

/* ---------- Copy button reusable ([data-copy-text]) ---------- */

function initCopyButtons() {
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-copy-text]');
    if (!button) return;
    try {
      await navigator.clipboard.writeText(button.getAttribute('data-copy-text') || '');
      const label = button.querySelector('[data-copy-label]') || button;
      const original = label.textContent;
      label.textContent = 'Copied ✓';
      button.setAttribute('aria-live', 'polite');
      window.setTimeout(() => { label.textContent = original; }, 1400);
    } catch (_) { /* clipboard tidak tersedia — abaikan */ }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  initPlaceholders();
  initCopyButtons();
});
