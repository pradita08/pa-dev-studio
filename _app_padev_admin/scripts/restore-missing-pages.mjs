import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagesDir = path.join(root, 'src', 'pages');

const missing = `
activity-history activity-timeline audit-log button-components calendar change-password
chart-cartesian chart-circular chart-mixed chart-states chat connected-accounts
contact-directory dashboard-crm dashboard-ecommerce dashboard-empty dashboard-finance
dashboard-hr dashboard-monitoring dashboard-project data-display-code data-display-components
data-display-diff data-display-lists data-display-timeline data-display-tree document-preview
edit-profile email-inbox feedback-alerts feedback-loading feedback-notifications feedback-states
feedback-sweetalert feedback-toast file-manager invoice-detail invoice-list kanban layout-blank
layout-compact layout-components layout-detail layout-form layout-horizontal layout-list
layout-master-detail layout-report layout-settings layout-split-view layout-wizard loading-components
media-components media-gallery media-player media-preview media-states navigation-accordion
navigation-breadcrumb navigation-page-header navigation-pagination navigation-stepper navigation-tabs
navigation-timeline notification-center overlay-confirmation overlay-drawer overlay-dropdown
overlay-modal overlay-popover permissions preferences profile report-viewer roles search-results
security-settings upload-manager user-detail user-list utility-accessibility utility-export
utility-print utility-responsive utility-rtl utility-theme verify-email`.trim().split(/\s+/);

const specs = {
  'activity-history': ['Activity History', 'Account', 'Riwayat aktivitas akun dengan filter waktu dan status.', 'account'],
  'activity-timeline': ['Activity Timeline', 'Productivity', 'Jejak aktivitas lintas workspace dalam urutan waktu.', 'timeline'],
  'audit-log': ['Audit Log', 'User & Access', 'Catatan perubahan akses dan konfigurasi yang dapat ditelusuri.', 'access'],
  'button-components': ['Button Components', 'Core', 'Variasi aksi, ukuran, state, dan kombinasi button PA DEV.', 'component'],
  'calendar': ['Calendar', 'Productivity', 'Agenda kerja, meeting, dan jadwal tim.', 'calendar'],
  'change-password': ['Change Password', 'Account', 'Perbarui kredensial akun dengan aturan keamanan yang jelas.', 'form'],
  'chart-cartesian': ['Cartesian Charts', 'Charts', 'Line, area, bar, dan stacked chart untuk data tren.', 'chart'],
  'chart-circular': ['Circular Charts', 'Charts', 'Donut, pie, dan radial chart untuk proporsi serta target.', 'chart'],
  'chart-mixed': ['Mixed Charts', 'Charts', 'Kombinasi metric, sparkline, dan series lintas skala.', 'chart'],
  'chart-states': ['Chart States', 'Charts', 'State loading, empty, dan error untuk visualisasi data.', 'states'],
  'chat': ['Chat', 'Communication', 'Percakapan tim dengan daftar kanal dan status kehadiran.', 'chat'],
  'connected-accounts': ['Connected Accounts', 'Account', 'Kelola koneksi layanan eksternal yang terhubung.', 'account'],
  'contact-directory': ['Contact Directory', 'Communication', 'Direktori rekan kerja dengan pencarian dan filter unit.', 'directory'],
  'dashboard-crm': ['CRM Dashboard', 'Dashboard', 'Ringkasan pipeline, leads, dan aktivitas pelanggan.', 'dashboard'],
  'dashboard-ecommerce': ['Ecommerce Dashboard', 'Dashboard', 'Ringkasan pesanan, pendapatan, dan produk terlaris.', 'dashboard'],
  'dashboard-empty': ['Empty Dashboard', 'Dashboard', 'State awal ketika workspace belum memiliki data.', 'empty'],
  'dashboard-finance': ['Finance Dashboard', 'Dashboard', 'Ringkasan cash flow, invoice, dan kesehatan keuangan.', 'dashboard'],
  'dashboard-hr': ['HR Dashboard', 'Dashboard', 'Ringkasan tenaga kerja, kehadiran, dan rekrutmen.', 'dashboard'],
  'dashboard-monitoring': ['Monitoring Dashboard', 'Dashboard', 'Status layanan, uptime, dan incident monitoring.', 'dashboard'],
  'dashboard-project': ['Project Dashboard', 'Dashboard', 'Progress proyek, workload, milestone, dan risiko.', 'dashboard'],
  'data-display-code': ['JSON & Code', 'Data Display', 'Code block, JSON viewer, dan copy interaction.', 'code'],
  'data-display-components': ['Data Display Components', 'Data Display', 'Katalog komponen data display yang reusable.', 'component'],
  'data-display-diff': ['Diff & Logs', 'Data Display', 'Perbandingan perubahan dan log operasional yang mudah dipindai.', 'logs'],
  'data-display-lists': ['Lists & Metrics', 'Data Display', 'List, metric, statistic, dan key-value presentation.', 'metrics'],
  'data-display-timeline': ['Timeline & Status', 'Data Display', 'Timeline aktivitas dan status dengan hierarki visual.', 'timeline'],
  'data-display-tree': ['Tree View', 'Data Display', 'Data hierarkis dengan struktur parent-child yang jelas.', 'tree'],
  'document-preview': ['Document Preview', 'Storage', 'Preview dokumen dengan metadata, versi, dan aksi file.', 'preview'],
  'edit-profile': ['Edit Profile', 'Account', 'Form profil dengan validasi dan preferensi kontak.', 'form'],
  'email-inbox': ['Email Inbox', 'Communication', 'Inbox email dengan folder, label, dan reading pane.', 'email'],
  'feedback-alerts': ['Alerts & Messages', 'Feedback', 'Alert, banner, dan inline message untuk status kontekstual.', 'component'],
  'feedback-loading': ['Loading & Progress', 'Feedback', 'Spinner, skeleton, progress bar, dan loading overlay.', 'loading'],
  'feedback-notifications': ['Notifications', 'Feedback', 'Notification card, unread state, dan notification center link.', 'notifications'],
  'feedback-states': ['Empty & Result States', 'Feedback', 'Empty, success, error, dan no-result state.', 'states'],
  'feedback-sweetalert': ['SweetAlert', 'Feedback', 'Confirmation feedback dengan pesan yang terarah.', 'component'],
  'feedback-toast': ['Toast', 'Feedback', 'Transient feedback untuk aksi yang baru selesai.', 'component'],
  'file-manager': ['File Manager', 'Storage', 'Kelola folder dan file dengan toolbar serta filter.', 'storage'],
  'invoice-detail': ['Invoice Detail', 'Business', 'Detail invoice, status pembayaran, dan ringkasan tagihan.', 'detail'],
  'invoice-list': ['Invoice List', 'Business', 'Daftar invoice dengan status, filter, dan aksi cepat.', 'table'],
  'kanban': ['Kanban', 'Productivity', 'Board tugas berbasis kolom dengan ringkasan workload.', 'kanban'],
  'layout-blank': ['Blank Layout', 'Layouts', 'Canvas kosong untuk memulai halaman baru.', 'layout'],
  'layout-compact': ['Compact Layout', 'Layouts', 'Layout rapat untuk data padat dan monitoring cepat.', 'layout'],
  'layout-components': ['Layout Components', 'Layouts', 'Building blocks layout dan page composition PA DEV.', 'layout'],
  'layout-detail': ['Detail Layout', 'Layouts', 'Komposisi halaman detail dengan metadata dan related actions.', 'layout'],
  'layout-form': ['Form Layout', 'Layouts', 'Layout form dengan grouping, helper, dan action footer.', 'layout'],
  'layout-horizontal': ['Horizontal Layout', 'Layouts', 'Layout horizontal untuk toolbar dan navigation flow.', 'layout'],
  'layout-list': ['List Layout', 'Layouts', 'Layout daftar dengan filter toolbar dan pagination.', 'layout'],
  'layout-master-detail': ['Master Detail Layout', 'Layouts', 'Split master list dan detail content dalam satu view.', 'layout'],
  'layout-report': ['Report Layout', 'Layouts', 'Layout report dengan filter, summary, dan export action.', 'layout'],
  'layout-settings': ['Settings Layout', 'Layouts', 'Navigasi pengaturan dan panel konfigurasi.', 'layout'],
  'layout-split-view': ['Split View Layout', 'Layouts', 'Dua panel responsif untuk konteks kerja berdampingan.', 'layout'],
  'layout-wizard': ['Wizard Layout', 'Layouts', 'Workflow bertahap dengan progress dan review.', 'layout'],
  'loading-components': ['Loading Components', 'Core', 'Komponen loading yang konsisten untuk berbagai surface.', 'loading'],
  'media-components': ['Media Components', 'Media', 'Katalog media, preview, player, dan state handling.', 'media'],
  'media-gallery': ['Gallery & Lightbox', 'Media', 'Gallery responsif dengan metadata dan lightbox affordance.', 'media'],
  'media-player': ['Audio & Video', 'Media', 'Media player dengan control, progress, dan transcript state.', 'media'],
  'media-preview': ['File & PDF Preview', 'Media', 'Preview visual untuk dokumen dan file terpilih.', 'preview'],
  'media-states': ['Media States', 'Media', 'Media card serta empty, loading, dan error state.', 'states'],
  'navigation-accordion': ['Accordion', 'Navigation', 'Disclosure content dengan hierarchy dan keyboard contract.', 'navigation'],
  'navigation-breadcrumb': ['Breadcrumb', 'Navigation', 'Orientasi lokasi halaman yang ringkas dan semantic.', 'navigation'],
  'navigation-page-header': ['Page Header & Toolbar', 'Navigation', 'Heading, metadata, filter, dan action toolbar.', 'navigation'],
  'navigation-pagination': ['Pagination', 'Navigation', 'Navigasi dataset dengan halaman aktif dan page size.', 'navigation'],
  'navigation-stepper': ['Stepper', 'Navigation', 'Workflow bertahap dengan completed dan current state.', 'navigation'],
  'navigation-tabs': ['Tabs', 'Navigation', 'Tabs, pills, underline, dan vertical navigation pattern.', 'navigation'],
  'navigation-timeline': ['Timeline', 'Navigation', 'Riwayat proses vertikal dengan status dan timestamp.', 'timeline'],
  'notification-center': ['Notification Center', 'Productivity', 'Pusat notifikasi dengan unread, filter, dan bulk action.', 'notifications'],
  'overlay-confirmation': ['Confirmation Dialog', 'Overlay', 'Konfirmasi aksi biasa dan destructive dengan focus yang aman.', 'overlay'],
  'overlay-drawer': ['Drawer & Bottom Sheet', 'Overlay', 'Panel samping dan bottom sheet untuk konteks tambahan.', 'overlay'],
  'overlay-dropdown': ['Dropdown & Context Menu', 'Overlay', 'Menu contextual yang mengikuti anchor dan viewport.', 'overlay'],
  'overlay-modal': ['Modal', 'Overlay', 'Modal basic, form, sized, dan fullscreen.', 'overlay'],
  'overlay-popover': ['Popover', 'Overlay', 'Contextual information surface yang tetap ringan.', 'overlay'],
  'permissions': ['Permissions', 'User & Access', 'Matriks permission per resource dan action.', 'access'],
  'preferences': ['Preferences', 'Account', 'Preferensi tampilan, bahasa, dan pengalaman pengguna.', 'form'],
  'profile': ['Profile', 'Account', 'Ringkasan profil pengguna dan aktivitas terakhir.', 'profile'],
  'report-viewer': ['Report Viewer', 'Business', 'Report terpilih dengan filter, summary, dan export.', 'report'],
  'roles': ['Roles', 'User & Access', 'Daftar role dan cakupan akses tiap peran.', 'access'],
  'search-results': ['Search Results', 'Business', 'Hasil pencarian lintas pengguna, invoice, dan report.', 'search'],
  'security-settings': ['Security Settings', 'Account', 'Pengaturan keamanan, session, dan perangkat aktif.', 'security'],
  'upload-manager': ['Upload Manager', 'Storage', 'Antrian upload, progress, retry, dan hasil validasi.', 'upload'],
  'user-detail': ['User Detail', 'User & Access', 'Detail akun, role, status, dan activity summary.', 'detail'],
  'user-list': ['User List', 'User & Access', 'Daftar pengguna dengan filter, bulk action, dan pagination.', 'table'],
  'utility-accessibility': ['Accessibility Utilities', 'Utilities', 'Kontrol aksesibilitas untuk kontras, focus, dan motion.', 'utility'],
  'utility-export': ['Export Utilities', 'Utilities', 'Pilihan format export dan ringkasan data yang akan diunduh.', 'utility'],
  'utility-print': ['Print Utilities', 'Utilities', 'Preview dan kontrol output untuk kebutuhan cetak.', 'utility'],
  'utility-responsive': ['Responsive Utilities', 'Utilities', 'Demonstrasi breakpoint dan perilaku komponen responsif.', 'utility'],
  'utility-rtl': ['RTL Demo', 'Utilities', 'Preview arah kanan-ke-kiri tanpa mengubah source theme.', 'utility'],
  'utility-theme': ['Theme Utilities', 'Utilities', 'Theme mode, accent, dan customization contract.', 'theme'],
};

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

const button = (label, variant = 'primary') => `<button type="button" class="ui-button ui-button--${variant} ui-button--sm">${label}</button>`;
const badge = (label, tone = 'primary') => `<span class="ui-badge ui-badge--sm ui-badge--soft ui-badge--${tone}">${label}</span>`;
const card = (title, body, extra = '') => `<article class="ui-card ui-card--bordered"><header class="ui-card-header"><div class="min-w-0"><h3 class="ui-card-title">${title}</h3><p class="ui-card-subtitle">${body}</p></div>${extra}</header></article>`;

function section(title, description, content, eyebrow = 'PA DEV SHOWCASE') {
  return `<section class="basic-section" aria-labelledby="section-${esc(title).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}"><header class="basic-section-header"><div><p class="basic-eyebrow">${eyebrow}</p><h2 id="section-${esc(title).replace(/[^a-z0-9]+/gi, '-').toLowerCase()}">${title}</h2><p>${description}</p></div><span class="basic-status">REUSABLE</span></header><div class="basic-section-body">${content}</div></section>`;
}

function metricGrid(labels = ['Active items', 'In review', 'Completed', 'Success rate']) {
  return `<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">${labels.map((label, index) => card(label, index === 0 ? 'Live workspace metric' : 'Compared with last period', `<strong class="mt-3 block font-display text-2xl text-ink-heading">${['128', '24', '86', '96.4%'][index]}</strong>`)).join('')}</div>`;
}

function table(title = 'Recent records', rows = ['PA DEV Admin Theme', 'Workspace Access Review', 'Quarterly Report', 'Design System Update']) {
  return `<div class="ui-table-card"><div class="ui-table-toolbar"><div><h3 class="font-display text-card-title font-semibold text-ink-heading">${title}</h3><p class="text-small text-ink-muted">Data demo dengan struktur tabel yang konsisten.</p></div><div class="flex flex-wrap gap-2">${button('Filter', 'outline')}${button('Export', 'ghost')}</div></div><div class="ui-table-scroll"><table class="ui-table ui-table--hover"><thead><tr><th scope="col">Name</th><th scope="col">Owner</th><th scope="col">Updated</th><th scope="col">Status</th><th scope="col"><span class="sr-only">Action</span></th></tr></thead><tbody>${rows.map((row, index) => `<tr data-row><td class="font-medium text-ink-heading">${row}</td><td>Pradita Alfiantoni</td><td>${index + 1} jam lalu</td><td>${badge(index === 1 ? 'Review' : 'Active', index === 1 ? 'warning' : 'success')}</td><td><button type="button" class="ui-button ui-button--ghost ui-button--xs">View</button></td></tr>`).join('')}</tbody></table></div><div class="ui-table-pagination"><span class="text-small text-ink-muted">Showing 1–${rows.length} of ${rows.length}</span><div><button type="button" aria-label="Previous page">‹</button><button type="button" class="is-active" aria-current="page">1</button><button type="button" aria-label="Next page">›</button></div></div></div>`;
}

function form(fields = ['Name', 'Email', 'Workspace']) {
  return `<form class="grid gap-5 md:grid-cols-2" onsubmit="return false">${fields.map((field, index) => `<label class="ui-form-field"><span class="ui-form-label">${field}</span><span class="ui-form-control ui-form-control--default ui-form-control--md"><input class="ui-form-input" type="${field === 'Email' ? 'email' : 'text'}" value="${index === 0 ? 'PA DEV Admin' : ''}" placeholder="Masukkan ${field.toLowerCase()}"${index === fields.length - 1 ? ' aria-describedby="form-helper"' : ''}></span>${index === fields.length - 1 ? '<span id="form-helper" class="ui-form-helper">Perubahan disimpan setelah konfirmasi.</span>' : ''}</label>`).join('')}<div class="flex flex-wrap gap-2 md:col-span-2">${button('Save changes')}${button('Cancel', 'ghost')}</div></form>`;
}

function componentContent(spec) {
  const [title, , desc, kind] = spec;
  if (kind === 'chart') return `${metricGrid(['Revenue', 'Orders', 'Conversion', 'Target'])}${section('Chart canvas', 'Visualisasi membaca token warna dan state yang sama dengan dashboard.', '<div class="grid min-h-56 place-items-center rounded-pa-lg border border-dashed border-primary-200 bg-primary-50/40"><div class="text-center"><div class="mx-auto mb-3 h-24 w-72 rounded-t-full border-4 border-primary-500 border-b-0"></div><p class="font-semibold text-ink-heading">Chart preview</p><p class="text-small text-ink-muted">Series, tooltip, legend, dan responsive behavior siap diintegrasikan.</p></div></div>', 'VISUALIZATION')}`;
  if (kind === 'loading') return `${section('Loading states', 'Gunakan state yang sesuai dengan durasi dan konteks data.', '<div class="grid gap-4 md:grid-cols-3"><div class="grid min-h-32 place-items-center rounded-pa-lg border border-line bg-surface"><span class="ui-button-spinner" aria-label="Loading"></span></div><div class="min-h-32 animate-pulse rounded-pa-lg border border-line bg-canvas p-4"><div class="h-4 w-2/3 rounded bg-line"></div><div class="mt-4 h-3 w-full rounded bg-line"></div><div class="mt-2 h-3 w-4/5 rounded bg-line"></div></div><div class="rounded-pa-lg border border-primary-200 bg-primary-50 p-4"><p class="font-semibold text-primary-700">Progress</p><div class="mt-4 h-2 rounded-full bg-primary-100"><div class="h-2 w-3/4 rounded-full bg-primary-600"></div></div><p class="mt-2 text-small text-primary-700">75% complete</p></div></div>', 'STATE CONTRACT')}`;
  if (kind === 'media') return `${section('Media surface', 'Media card menjaga rasio, metadata, dan action tetap konsisten.', '<div class="grid gap-4 md:grid-cols-3">' + ['Meeting room', 'Product preview', 'Office tour'].map((label, index) => `<article class="overflow-hidden rounded-pa-lg border border-line bg-surface"><div class="grid h-36 place-items-center bg-primary-50 text-primary-600"><span class="font-display text-3xl">${['◈', '▣', '◉'][index]}</span></div><div class="p-4"><h3 class="font-semibold text-ink-heading">${label}</h3><p class="mt-1 text-small text-ink-muted">SVG media asset · 2.4 MB</p></div></article>`).join('') + '</div>', 'MEDIA SYSTEM')}`;
  if (kind === 'navigation') return `${section('Navigation pattern', desc, '<div class="flex flex-wrap gap-2 border-b border-line pb-3"><button type="button" class="ui-button ui-button--soft ui-button--sm">Overview</button><button type="button" class="ui-button ui-button--ghost ui-button--sm">Activity</button><button type="button" class="ui-button ui-button--ghost ui-button--sm">Settings</button></div><div class="mt-4 grid gap-3 md:grid-cols-2">' + ['Current step', 'Next action', 'Completed item', 'Context helper'].map((item, index) => card(item, index % 2 ? 'Supporting navigation state' : 'Primary navigation state', badge(index < 2 ? 'Ready' : 'Done', index < 2 ? 'primary' : 'success'))).join('') + '</div>', 'NAVIGATION CONTRACT')}`;
  if (kind === 'overlay') return `${section('Overlay surface', desc, '<div class="grid gap-4 md:grid-cols-2"><div class="rounded-pa-lg border border-line bg-surface p-5 shadow-elevation-xs"><div class="flex items-center justify-between"><h3 class="font-display text-card-title font-semibold text-ink-heading">Dialog title</h3><button type="button" class="ui-button ui-button--ghost ui-button--xs" aria-label="Close">×</button></div><p class="mt-3 text-small text-ink-body">Overlay mempertahankan focus, escape, dan action hierarchy.</p><div class="mt-5 flex justify-end gap-2">' + button('Cancel', 'ghost') + button('Confirm') + '</div></div><div class="rounded-pa-lg border border-line bg-surface p-5"><p class="basic-eyebrow">ANCHOR</p><h3 class="mt-1 font-display text-card-title font-semibold text-ink-heading">Contextual surface</h3><p class="mt-2 text-small text-ink-muted">Drawer, popover, dropdown, atau modal bisa memakai kontrak yang sama.</p><div class="mt-5 flex gap-2">' + button('Open') + button('More', 'outline') + '</div></div></div>', 'OVERLAY CONTRACT')}`;
  if (kind === 'states') return `${section('Result states', desc, '<div class="grid gap-4 md:grid-cols-3"><div class="rounded-pa-lg border border-line p-5 text-center"><span class="text-2xl text-success">✓</span><h3 class="mt-2 font-semibold text-ink-heading">Success</h3><p class="mt-1 text-small text-ink-muted">Action completed successfully.</p></div><div class="rounded-pa-lg border border-line p-5 text-center"><span class="text-2xl text-warning">!</span><h3 class="mt-2 font-semibold text-ink-heading">Empty</h3><p class="mt-1 text-small text-ink-muted">Belum ada data untuk ditampilkan.</p></div><div class="rounded-pa-lg border border-line p-5 text-center"><span class="text-2xl text-danger">×</span><h3 class="mt-2 font-semibold text-ink-heading">Error</h3><p class="mt-1 text-small text-ink-muted">Coba lagi atau hubungi administrator.</p></div></div>', 'STATE CONTRACT')}`;
  if (kind === 'code') return `${section('Code viewer', desc, '<div class="overflow-auto rounded-pa-lg bg-ink-heading p-5 text-sm text-primary-100"><pre><code>{\n  "status": "active",\n  "workspace": "PA DEV",\n  "version": "0.1.0"\n}</code></pre></div><div class="mt-4 flex gap-2">' + button('Copy JSON', 'outline') + button('Download', 'ghost') + '</div>', 'DEVELOPER DISPLAY')}`;
  if (kind === 'logs') return `${table('Change log', ['Update navigation contract', 'Add accessible table state', 'Publish theme tokens', 'Rotate preview session'])}`;
  if (kind === 'metrics') return `${metricGrid()}${section('Key-value list', desc, '<dl class="grid gap-3 sm:grid-cols-2"><div class="rounded-pa-md border border-line p-4"><dt class="text-small text-ink-muted">Workspace</dt><dd class="mt-1 font-semibold text-ink-heading">PA DEV Admin</dd></div><div class="rounded-pa-md border border-line p-4"><dt class="text-small text-ink-muted">Last sync</dt><dd class="mt-1 font-semibold text-ink-heading">Today, 14:32 WIB</dd></div></dl>', 'DATA DISPLAY')}`;
  return `${section(title, desc, '<div class="grid gap-4 md:grid-cols-3">' + [ ['Primary action', 'Aksi utama memakai hierarchy paling jelas.'], ['Secondary action', 'Aksi pendukung tetap mudah ditemukan.'], ['Disabled state', 'State nonaktif tetap terbaca dan terukur.'] ].map(([label, body], index) => card(label, body, button(index === 0 ? 'Continue' : index === 1 ? 'Review' : 'Unavailable', index === 2 ? 'ghost' : index === 1 ? 'outline' : 'primary'))).join('') + '</div>', 'COMPONENT CONTRACT')}`;
}

function contentFor([title, group, desc, kind]) {
  if (kind === 'dashboard') {
    const chartBars = [35, 58, 48, 76, 64, 88, 72].map((height) => `<i class="flex-1 rounded-t-md ${height > 70 ? 'bg-primary-600' : 'bg-primary-200'}" style="height:${height}%"></i>`).join('');
    const priorities = ['Review pipeline', 'Approve workspace access', 'Publish Q3 report'].map((item, index) => `<li class="flex items-center justify-between gap-3 border-b border-line pb-3"><span class="text-small text-ink-body">${item}</span>${badge(index === 1 ? 'Review' : 'Ready', index === 1 ? 'warning' : 'primary')}</li>`).join('');
    const overview = '<div class="grid gap-4 lg:grid-cols-[1.5fr_1fr]"><div class="min-h-64 rounded-pa-lg border border-line bg-surface p-5"><div class="flex items-center justify-between"><h3 class="font-display text-card-title font-semibold text-ink-heading">Weekly trend</h3>' + badge('Live', 'success') + '</div><div class="mt-8 flex h-36 items-end gap-3">' + chartBars + '</div></div><div class="min-h-64 rounded-pa-lg border border-line bg-surface p-5"><h3 class="font-display text-card-title font-semibold text-ink-heading">Top priorities</h3><ul class="mt-4 grid gap-3">' + priorities + '</ul></div></div>';
    return metricGrid(['Revenue', 'Open deals', 'Active users', 'Goal progress']) + section('Performance overview', desc, overview, 'DASHBOARD') + table('Recent activity');
  }
  if (kind === 'empty') return section('Workspace empty state', desc, '<div class="grid min-h-64 place-items-center rounded-pa-lg border border-dashed border-primary-200 bg-primary-50/30 p-8 text-center"><div><div class="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary-100 text-2xl text-primary-600">＋</div><h3 class="mt-4 font-display text-xl font-semibold text-ink-heading">Belum ada data</h3><p class="mx-auto mt-2 max-w-md text-small text-ink-muted">Mulai dengan membuat entry pertama agar dashboard menampilkan ringkasan workspace.</p><div class="mt-5">' + button('Create first entry') + '</div></div></div>', 'EMPTY STATE');
  if (kind === 'layout') {
    const layoutItems = ['Overview', 'Activity', 'Settings'].map((item, index) => `<div class="rounded-md ${index === 0 ? 'bg-primary-600 text-white' : 'bg-surface text-ink-body'} px-3 py-2 text-small">${item}</div>`).join('');
    const layoutCards = [1, 2, 3].map(() => '<div class="h-20 rounded-md border border-line bg-canvas"></div>').join('');
    const canvas = '<div class="grid min-h-72 gap-3 rounded-pa-lg border border-dashed border-primary-200 bg-canvas p-3 md:grid-cols-[minmax(10rem,.7fr)_minmax(0,2fr)]"><aside class="rounded-pa-md bg-primary-50 p-4"><p class="basic-eyebrow">SIDEBAR</p><div class="mt-4 grid gap-2">' + layoutItems + '</div></aside><div class="rounded-pa-md bg-surface p-5"><div class="h-5 w-1/3 rounded bg-line"></div><div class="mt-4 grid gap-3 sm:grid-cols-3">' + layoutCards + '</div><div class="mt-4 h-24 rounded-md border border-line bg-canvas"></div></div></div>';
    return section('Layout canvas', desc, canvas, 'LAYOUT CONTRACT') + table('Composition references');
  }
  if (kind === 'form' || kind === 'security' || kind === 'theme' || kind === 'account') {
    const guidance = '<div class="grid gap-3 md:grid-cols-3"><div>' + badge('Required', 'danger') + '<p class="mt-2 text-small text-ink-muted">Field penting diberi penanda dan validasi.</p></div><div>' + badge('Saved', 'success') + '<p class="mt-2 text-small text-ink-muted">Status perubahan terlihat setelah aksi.</p></div><div>' + badge('Preview', 'info') + '<p class="mt-2 text-small text-ink-muted">Perubahan dapat dipreview sebelum diterapkan.</p></div></div>';
    return section('Configuration form', desc, form(kind === 'security' ? ['Current password', 'New password', 'Confirm password'] : ['Display name', 'Email', 'Timezone']), 'FORM CONTRACT') + section('Guidance', 'Helper text menjaga ekspektasi pengguna tetap jelas.', guidance, 'USAGE');
  }
  if (kind === 'access' || kind === 'table') return section('Toolbar & filters', desc, '<div class="flex flex-wrap gap-3"><label class="ui-form-control ui-form-control--default ui-form-control--sm min-w-56"><input class="ui-form-input" type="search" placeholder="Search records"></label><select class="min-h-9 rounded-pa-md border border-line bg-surface px-3 text-small text-ink-heading"><option>All status</option><option>Active</option><option>Review</option></select>' + button('Add new') + '</div>', 'DATA CONTRACT') + table(title);
  if (kind === 'detail' || kind === 'profile') return section('Summary', desc, '<div class="grid gap-4 md:grid-cols-3">' + ['Overview', 'Access & status', 'Recent activity'].map((label, index) => card(label, index === 0 ? 'Primary information' : index === 1 ? 'Validated today' : 'Updated recently', badge(index === 1 ? 'Active' : 'Ready', index === 1 ? 'success' : 'primary'))).join('') + '</div>', 'DETAIL') + table('Related records');
  if (kind === 'calendar') {
    const days = Array.from({ length: 35 }, (_, index) => `<div class="min-h-16 rounded-md border ${index === 16 ? 'border-primary-500 bg-primary-50' : 'border-line bg-surface'} p-2 text-right text-xs text-ink-muted"><span>${(index % 30) + 1}</span>${[9, 16, 22].includes(index) ? '<i class="mt-2 block h-1.5 rounded-full bg-primary-600"></i>' : ''}</div>`).join('');
    return section('Monthly agenda', desc, '<div class="grid gap-2 sm:grid-cols-7">' + days + '</div>', 'CALENDAR') + table('Upcoming events', ['Design review · 09:00', 'Team sync · 11:30', 'Customer demo · 15:00']);
  }
  if (kind === 'kanban') return section('Work board', desc, '<div class="grid gap-4 md:grid-cols-3">' + [['Todo', ['Prepare brief', 'Review access']], ['In progress', ['Build dashboard', 'QA navigation']], ['Done', ['Publish tokens', 'Close sprint']]].map(([column, items]) => `<section class="rounded-pa-lg bg-canvas p-3"><div class="flex items-center justify-between"><h3 class="font-semibold text-ink-heading">${column}</h3>${badge(String(items.length), 'neutral')}</div><div class="mt-3 grid gap-3">${items.map((item) => '<article class="rounded-md border border-line bg-surface p-3 shadow-elevation-xs"><p class="text-small font-semibold text-ink-heading">' + item + '</p><p class="mt-2 text-xs text-ink-muted">PA DEV workspace</p></article>').join('')}</div></section>`).join('') + '</div>', 'KANBAN');
  if (kind === 'timeline') return section('Activity timeline', desc, '<ol class="grid gap-0">' + ['Workspace created', 'Permission reviewed', 'Report published', 'Session verified'].map((item, index) => `<li class="relative flex gap-4 border-l border-primary-200 pb-7 pl-6 last:pb-0"><span class="absolute -left-2 top-0 h-4 w-4 rounded-full border-4 border-surface bg-primary-600"></span><div><h3 class="font-semibold text-ink-heading">${item}</h3><p class="mt-1 text-small text-ink-muted">${index + 1} hour${index === 0 ? '' : 's'} ago · Pradita Alfiantoni</p></div></li>`).join('') + '</ol>', 'TIMELINE');
  if (kind === 'chat' || kind === 'email' || kind === 'directory') return section('Communication workspace', desc, '<div class="grid min-h-72 gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]"><aside class="rounded-pa-md bg-canvas p-3"><p class="basic-eyebrow">CONVERSATIONS</p><div class="mt-3 grid gap-2">' + ['General', 'Design team', 'Project Alpha', 'Support'].map((item, index) => `<div class="rounded-md ${index === 0 ? 'bg-primary-600 text-white' : 'bg-surface text-ink-body'} px-3 py-2 text-small">${item}</div>`).join('') + '</div></aside><div class="flex flex-col rounded-pa-md border border-line bg-surface p-4"><div class="border-b border-line pb-3"><h3 class="font-display text-card-title font-semibold text-ink-heading">' + title + '</h3><p class="text-small text-ink-muted">4 participants · online</p></div><div class="flex-1 space-y-3 py-4"><p class="max-w-md rounded-lg bg-canvas p-3 text-small text-ink-body">Selamat datang di workspace PA DEV.</p><p class="ml-auto max-w-md rounded-lg bg-primary-50 p-3 text-small text-ink-body">Siap, saya lanjutkan review komponen.</p></div><div class="flex gap-2"><input class="ui-form-input min-w-0 flex-1 rounded-pa-md border border-line bg-canvas px-3 py-2 text-small" placeholder="Write a message"><button type="button" class="ui-button ui-button--primary ui-button--sm">Send</button></div></div></div>', 'COMMUNICATION');
  if (kind === 'notifications') return section('Notification center', desc, '<div class="flex flex-wrap gap-2">' + button('All', 'soft') + button('Unread', 'ghost') + button('Mentions', 'ghost') + '</div><div class="mt-4 grid gap-3">' + ['Workspace access was approved', 'Report export is ready', 'New activity in Project Alpha'].map((item, index) => `<article class="flex gap-3 rounded-pa-md border border-line p-4 ${index === 0 ? 'bg-primary-50/50' : ''}"><span class="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-600"></span><div><h3 class="font-semibold text-ink-heading">${item}</h3><p class="mt-1 text-small text-ink-muted">${index + 1} hour ago · Click to inspect detail.</p></div></article>`).join('') + '</div>', 'NOTIFICATION');
  if (kind === 'report' || kind === 'search') return section('Report controls', desc, '<div class="grid gap-3 md:grid-cols-[1fr_12rem_auto]"><input class="ui-form-input rounded-pa-md border border-line bg-surface px-3 py-2 text-small" placeholder="Search report or keyword"><select class="rounded-pa-md border border-line bg-surface px-3 py-2 text-small"><option>Last 30 days</option><option>Last quarter</option></select>' + button('Run report') + '</div>', 'BUSINESS') + metricGrid(['Gross value', 'Collected', 'Outstanding', 'Coverage']) + table('Searchable results', ['Admin Theme Revenue · Q3 2026', 'Workspace Access Review', 'Invoice INV-2026-014']);
  if (kind === 'storage' || kind === 'upload' || kind === 'preview') return section('Storage workspace', desc, '<div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-small text-ink-muted">Workspace / Documents</p><p class="mt-1 font-semibold text-ink-heading">24 files · 1.8 GB used</p></div><div class="flex gap-2">' + button('New folder', 'outline') + button(kind === 'upload' ? 'Upload files' : 'Open picker') + '</div></div><div class="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">' + ['Brand assets', 'Quarterly report.pdf', 'Meeting notes.docx', 'Data export.csv'].map((item, index) => `<article class="rounded-pa-md border border-line bg-surface p-4"><div class="grid h-20 place-items-center rounded-md bg-primary-50 text-primary-600"><span class="font-display text-xl">${index < 1 ? '▰' : '▤'}</span></div><h3 class="mt-3 truncate font-semibold text-ink-heading">${item}</h3><p class="mt-1 text-xs text-ink-muted">${index + 1}.2 MB · updated today</p></article>`).join('') + '</div>', 'STORAGE');
  if (kind === 'utility') return section('Utility preview', desc, '<div class="grid gap-4 md:grid-cols-2">' + ['Responsive preview', 'Print-safe surface', 'Export options', 'Accessibility checks'].map((item, index) => card(item, ['Resize the viewport to inspect behavior.', 'Use the print action to verify output.', 'Choose CSV or JSON for downstream work.', 'Focus order and contrast remain visible.'][index], badge(index === 3 ? 'Passed' : 'Ready', index === 3 ? 'success' : 'primary'))).join('') + '</div>', 'UTILITY CONTRACT');
  return componentContent([title, group, desc, kind]);
}

function shellFor(base, file, [title, group, desc, kind]) {
  let html = base.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)} · PA DEV Admin</title>`);
  html = html.replace(/<nav class="sidebar-nav"[\s\S]*?<\/nav>/, '<nav class="sidebar-nav" aria-label="Theme demo navigation" data-sidebar-canonical="runtime"></nav>');
  const breadcrumb = `<ol class="flex items-center gap-2 text-sm"><li class="flex min-w-0 items-center gap-2"><a href="./dashboard.html" class="truncate text-ink-muted transition-colors hover:text-primary-600">Theme Demo</a></li><li class="flex min-w-0 items-center gap-2"><span class="text-ink-muted" aria-hidden="true">/</span><span class="truncate text-ink-muted">${esc(group)}</span></li><li class="flex min-w-0 items-center gap-2"><span class="text-ink-muted" aria-hidden="true">/</span><span class="truncate font-medium text-ink-heading" aria-current="page">${esc(title)}</span></li></ol>`;
  html = html.replace(/<ol class="flex items-center gap-2 text-sm">[\s\S]*?<\/ol>/, breadcrumb);
  const main = `<main id="konten-utama" class="mx-auto w-full max-w-container flex-1 p-4 md:p-6 xl:p-8"><div class="mb-6 flex flex-wrap items-end justify-between gap-3"><div class="min-w-0"><p class="text-xs font-semibold uppercase tracking-wide text-primary-600">${esc(group)}</p><h1 class="page-title">${esc(title)}</h1><p class="mt-1 text-sm text-ink-muted">${esc(desc)}</p></div><div class="flex gap-2">${button('Preview', 'outline')}${button('Documentation', 'ghost')}</div></div><div class="basic-page space-y-6">${contentFor([title, group, desc, kind])}</div></main>`;
  html = html.replace(/<main id="konten-utama"[\s\S]*?<\/main>/, main);
  html = html.replace(/\n<script src="\.\/assets\/js\/dashboard-i18n\.js" defer><\/script>/g, '');
  return html;
}

function authShellFor(base, file) {
  let html = base.replace(/<title>[\s\S]*?<\/title>/, '<title>Verify Email · PA DEV</title>');
  html = html.replace(/<article class="auth-card"[\s\S]*?<\/article>/, `<article class="auth-card" aria-labelledby="auth-title"><header class="auth-card-header"><p class="auth-card-eyebrow">Account security</p><h1 id="auth-title">Verify your email</h1><p>Kami sudah mengirim link verifikasi ke alamat email yang terdaftar.</p></header><div class="grid gap-4"><div class="rounded-pa-md border border-primary-200 bg-primary-50 p-4 text-small text-primary-700" role="status"><strong>Check your inbox</strong><p class="mt-1">Buka email dari PA DEV dan klik tombol verifikasi untuk mengaktifkan workspace.</p></div><form class="auth-form" onsubmit="return false"><label class="ui-form-field"><span class="ui-form-label">Email address</span><span class="ui-form-control ui-form-control--default ui-form-control--md"><input class="ui-form-input" type="email" value="name@company.com" autocomplete="email"></span></label><button type="submit" class="ui-button ui-button--primary ui-button--md auth-submit">Resend verification email</button></form><p class="auth-note">Link verifikasi berlaku selama 24 jam. Kamu dapat kembali ke login kapan saja.</p></div><footer class="auth-card-footer"><a href="./login.html">Back to sign in</a></footer></article>`);
  html = html.replace(/<nav class="auth-page-links"[\s\S]*?<\/nav>/, '<nav class="auth-page-links" aria-label="Authentication demo pages"><a href="./login.html">Login</a><a href="./register.html">Register</a><a href="./verify-email.html" aria-current="page">Verify</a><a href="./forgot-password.html">Forgot</a></nav>');
  return html;
}

const base = await readFile(path.join(pagesDir, 'dashboard.html'), 'utf8');
const authBase = await readFile(path.join(pagesDir, 'login.html'), 'utf8');

for (const [file, spec] of Object.entries(specs)) {
  if (file === 'verify-email') continue;
  await writeFile(path.join(pagesDir, `${file}.html`), shellFor(base, file, spec));
}
await writeFile(path.join(pagesDir, 'verify-email.html'), authShellFor(authBase, 'verify-email'));

// Existing app pages use the same canonical runtime sidebar, so no page retains the truncated menu.
for (const entry of await (await import('node:fs/promises')).readdir(pagesDir)) {
  if (!entry.endsWith('.html')) continue;
  const file = path.join(pagesDir, entry);
  const html = await readFile(file, 'utf8');
  const cleaned = html.replace(/<nav class="sidebar-nav"[\s\S]*?<\/nav>/, '<nav class="sidebar-nav" aria-label="Theme demo navigation" data-sidebar-canonical="runtime"></nav>');
  if (cleaned !== html) await writeFile(file, cleaned);
}

console.log(`Restored ${missing.length} missing route pages.`);
