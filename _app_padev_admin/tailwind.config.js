/**
 * PA DEV Admin Theme — standalone source of truth
 * Design tokens mengikuti referensi visual _refrence/padev_ui1-4.png
 * Dokumentasi: PA DEV Admin Theme design system
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.html',
    './src/js/**/*.js',
  ],
  // Modifier berikut sudah ada di markup static sebagai entity-encoded class
  // dan perlu dipertahankan agar production build tidak membuang kontrak ukurannya.
  safelist: [
    // Kelas tema yang dipakai halaman User Management. Sebelumnya ikut hidup
    // karena dirujuk halaman demo; setelah halaman itu dihapus, keduanya harus
    // disebut di sini agar tidak dipangkas dari build.
    'basic-section', 'basic-section-header', 'basic-section-body', 'basic-eyebrow',
    // Nada toast disusun runtime (`ui-feedback--${jenis}`), jadi pemindai tidak
    // pernah menemukan kandidatnya di berkas mana pun. Tanpa keduanya toast
    // terbit tanpa warna nada — berhasil dan gagal tampak sama persis.
    'ui-feedback--success', 'ui-feedback--danger',
    'ui-table--hover', 'ui-table-card', 'ui-table-responsive', 'ui-table-action-cell',
    'ui-avatar-cell',
    'ui-button--icon-only',
    'ui-button--circle',
    'ui-button--full',
    'ui-button--confirm',
    'select2-container',
    'select2-container--open',
    'select2-container--focus',
    'select2-container--disabled',
    'select2-selection',
    'select2-selection--single',
    'select2-selection--multiple',
    'select2-selection__rendered',
    'select2-selection__placeholder',
    'select2-selection__arrow',
    'select2-selection__clear',
    'select2-selection__choice',
    'select2-selection__choice__remove',
    'select2-search--inline',
    'select2-search--dropdown',
    'select2-search__field',
    'select2-dropdown',
    'select2-results__options',
    'select2-results__option',
    'select2-results__option--highlighted',
    'select2-results__group',
  ],
  theme: {
    extend: {
      colors: {
        // Runtime channels are switched by Theme Customizer without rebuild.
        primary: {
          50: 'rgb(var(--primary-50) / <alpha-value>)',
          100: 'rgb(var(--primary-100) / <alpha-value>)',
          200: 'rgb(var(--primary-200) / <alpha-value>)',
          300: 'rgb(var(--primary-300) / <alpha-value>)',
          400: 'rgb(var(--primary-400) / <alpha-value>)',
          500: 'rgb(var(--primary-500) / <alpha-value>)',
          600: 'rgb(var(--primary-600) / <alpha-value>)',
          700: 'rgb(var(--primary-700) / <alpha-value>)',
          800: 'rgb(var(--primary-800) / <alpha-value>)',
          900: 'rgb(var(--primary-900) / <alpha-value>)',
          950: 'rgb(var(--primary-950) / <alpha-value>)',
          DEFAULT: 'rgb(var(--primary-600) / <alpha-value>)',
        },
        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
        },
        sidebar: {
          DEFAULT: '#1E3A8A',
          light: '#274DA2',
          deep: '#162D6A',
        },
        surface: 'rgb(var(--surface-ch) / <alpha-value>)',
        canvas: 'rgb(var(--canvas-ch) / <alpha-value>)',
        success: '#16A34A',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#0EA5E9',
        ink: {
          heading: 'rgb(var(--ink-heading-ch) / <alpha-value>)',
          body: 'rgb(var(--ink-body-ch) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted-ch) / <alpha-value>)',
        },
        line: 'rgb(var(--line-ch) / <alpha-value>)',
        state: {
          hover: '#EFF6FF',
          active: '#DBEAFE',
          disabled: '#CBD5E1',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        ui: ['Outfit', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Josefin Sans', 'Outfit', 'system-ui', 'sans-serif'],
      },
      // Type scale final Phase 1.6: Josefin untuk application shell,
      // Outfit untuk seluruh UI content.
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.125rem' }],
        sm: ['0.875rem', { lineHeight: '1.375rem' }],
        table: ['0.8125rem', { lineHeight: '1.125rem' }],
        title: ['1.75rem', { lineHeight: '2.25rem' }],
        'display-brand': ['1.1875rem', { lineHeight: '1.5rem' }],
        'display-h1': ['1.875rem', { lineHeight: '2.375rem' }],
        'display-h2': ['1.5rem', { lineHeight: '2rem' }],
        'card-title': ['1rem', { lineHeight: '1.5rem' }],
        body: ['0.875rem', { lineHeight: '1.375rem' }],
        caption: ['0.75rem', { lineHeight: '1.125rem' }],
        'menu-parent': ['0.9375rem', { lineHeight: '1.375rem' }],
        'menu-child': ['0.875rem', { lineHeight: '1.3125rem' }],
        'foundation-display': ['2.5rem', { lineHeight: '3rem', fontWeight: '600', letterSpacing: '-0.015em' }],
        'foundation-h3': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600', letterSpacing: '-0.005em' }],
        'foundation-h4': ['1.125rem', { lineHeight: '1.625rem', fontWeight: '600', letterSpacing: '-0.0025em' }],
        'foundation-h5': ['1rem', { lineHeight: '1.5rem', fontWeight: '600', letterSpacing: '0' }],
        'body-lg': ['1rem', { lineHeight: '1.625rem' }],
        small: ['0.8125rem', { lineHeight: '1.25rem' }],
        helper: ['0.75rem', { lineHeight: '1.125rem' }],
      },
      // Weight antara dari font variable (400–700) — dipakai sebagai token,
      // jangan hardcode angka weight di markup.
      fontWeight: {
        450: '450',
        550: '550',
        650: '650',
      },
      boxShadow: {
        card: '0 1px 3px rgb(15 23 42 / 0.06), 0 4px 12px rgb(15 23 42 / 0.05)',
        float: '0 10px 30px rgb(15 23 42 / 0.15)',
        'elevation-xs': '0 1px 2px rgb(15 23 42 / 0.05)',
        'elevation-sm': '0 2px 6px rgb(15 23 42 / 0.07)',
        'elevation-md': '0 1px 3px rgb(15 23 42 / 0.06), 0 4px 12px rgb(15 23 42 / 0.05)',
        'elevation-lg': '0 8px 20px rgb(15 23 42 / 0.09)',
        'elevation-xl': '0 14px 36px rgb(15 23 42 / 0.12)',
        'elevation-premium': '0 20px 50px rgb(15 23 42 / 0.14), inset 0 1px 0 rgb(255 255 255 / 0.7)',
      },
      borderRadius: {
        'pa-xs': '0.125rem',
        'pa-sm': '0.25rem',
        'pa-md': '0.5rem',
        'pa-lg': '0.75rem',
        'pa-xl': '1rem',
        'pa-2xl': '1.5rem',
        'pa-full': '9999px',
      },
      spacing: {
        sidebar: '260px',
        'sidebar-mini': '76px',
        navbar: '64px',
        'pa-4': '0.25rem',
        'pa-8': '0.5rem',
        'pa-12': '0.75rem',
        'pa-16': '1rem',
        'pa-20': '1.25rem',
        'pa-24': '1.5rem',
        'pa-32': '2rem',
        'pa-40': '2.5rem',
        'pa-48': '3rem',
        'pa-64': '4rem',
      },
      transitionDuration: {
        'motion-fast': '150ms',
        'motion-base': '200ms',
        'motion-slow': '300ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
        // Pasangan akselerasi untuk entrance; dirujuk --ease-exit pada toast leave.
        exit: 'cubic-bezier(0.4, 0, 1, 1)',
      },
      maxWidth: {
        container: '1320px',
      },
    },
  },
  plugins: [],
};
