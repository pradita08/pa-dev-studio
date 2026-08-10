/** Dashboard variant locale bridge. Keeps static dashboard demo content in the shared runtime. */
(() => {
  'use strict';

  const entries = [
    ['CRM Dashboard', 'CRM Dashboard', 'Dashboard CRM', 'Dashboard CRM'], ['Ecommerce Dashboard', 'Ecommerce Dashboard', 'Dashboard Ecommerce', 'Dashboard Ecommerce'], ['Finance Dashboard', 'Finance Dashboard', 'Dashboard Finance', 'Dashboard Finance'], ['HR Dashboard', 'HR Dashboard', 'Dashboard HR', 'Dashboard HR'], ['Monitoring Dashboard', 'Monitoring Dashboard', 'Dashboard Monitoring', 'Dashboard Monitoring'], ['Project Dashboard', 'Project Dashboard', 'Dashboard Project', 'Dashboard Project'],
    ['Dashboard variants', 'Dashboard variants', 'Varian Dashboard', 'Varian Dashboard'], ['CRM period', 'CRM period', 'Periode CRM', 'Tempoh CRM'], ['Ecommerce period', 'Ecommerce period', 'Periode Ecommerce', 'Tempoh Ecommerce'], ['Workspace state', 'Workspace state', 'Status Workspace', 'Status Workspace'], ['This quarter', 'This quarter', 'Kuartal ini', 'Suku ini'], ['This month', 'This month', 'Bulan ini', 'Bulan ini'], ['Last 30 days', 'Last 30 days', '30 hari terakhir', '30 hari terakhir'], ['Previous month', 'Previous month', 'Bulan sebelumnya', 'Bulan sebelumnya'], ['Archived period', 'Archived period', 'Periode diarsipkan', 'Tempoh diarkibkan'], ['New workspace', 'New workspace', 'Workspace baru', 'Workspace baharu'], ['Sample workspace', 'Sample workspace', 'Contoh Workspace', 'Contoh Workspace'], ['Archived workspace', 'Archived workspace', 'Workspace diarsipkan', 'Workspace diarkibkan'],
    ['Check the connection and refresh again.', 'Check the connection and refresh again.', 'Periksa koneksi lalu refresh kembali.', 'Semak sambungan kemudian refresh semula.'], ['CRM data unavailable', 'CRM data unavailable', 'Data CRM tidak tersedia', 'Data CRM tidak tersedia'], ['No CRM activity', 'No CRM activity', 'Tidak ada aktivitas CRM', 'Tiada aktiviti CRM'], ['No pipeline data exists for the selected period.', 'No pipeline data exists for the selected period.', 'Tidak ada data pipeline untuk periode yang dipilih.', 'Tiada data pipeline bagi tempoh dipilih.'], ['Store data unavailable', 'Store data unavailable', 'Data toko tidak tersedia', 'Data kedai tidak tersedia'], ['No store activity', 'No store activity', 'Tidak ada aktivitas toko', 'Tiada aktiviti kedai'], ['No orders exist for the selected period.', 'No orders exist for the selected period.', 'Tidak ada order untuk periode yang dipilih.', 'Tiada pesanan bagi tempoh dipilih.'], ['Finance data unavailable', 'Finance data unavailable', 'Data keuangan tidak tersedia', 'Data kewangan tidak tersedia'], ['No financial records', 'No financial records', 'Tidak ada catatan keuangan', 'Tiada rekod kewangan'], ['No transactions exist for the selected period.', 'No transactions exist for the selected period.', 'Tidak ada transaksi untuk periode yang dipilih.', 'Tiada transaksi bagi tempoh dipilih.'], ['HR data unavailable', 'HR data unavailable', 'Data HR tidak tersedia', 'Data HR tidak tersedia'], ['No workforce data', 'No workforce data', 'Tidak ada data tenaga kerja', 'Tiada data tenaga kerja'], ['No employee records exist for the selected period.', 'No employee records exist for the selected period.', 'Tidak ada catatan karyawan untuk periode yang dipilih.', 'Tiada rekod pekerja bagi tempoh dipilih.'], ['Telemetry unavailable', 'Telemetry unavailable', 'Telemetri tidak tersedia', 'Telemetri tidak tersedia'], ['No incidents detected', 'No incidents detected', 'Tidak ada insiden terdeteksi', 'Tiada insiden dikesan'], ['Project data unavailable', 'Project data unavailable', 'Data Project tidak tersedia', 'Data Project tidak tersedia'], ['No active projects', 'No active projects', 'Tidak ada Project aktif', 'Tiada Project aktif'], ['Create a project to start tracking delivery.', 'Create a project to start tracking delivery.', 'Buat Project untuk mulai melacak pengiriman.', 'Cipta Project untuk mula menjejak penghantaran.'],
    ['Add lead', 'Add lead', 'Tambah prospek', 'Tambah prospek'], ['Create deal', 'Create deal', 'Buat kesepakatan', 'Cipta urus niaga'], ['Send campaign', 'Send campaign', 'Kirim kampanye', 'Hantar kempen'], ['Sales report', 'Sales report', 'Laporan penjualan', 'Laporan jualan'], ['Add product', 'Add product', 'Tambah produk', 'Tambah produk'], ['Create order', 'Create order', 'Buat order', 'Cipta pesanan'], ['Customers', 'Customers', 'Pelanggan', 'Pelanggan'], ['Connect data', 'Connect data', 'Hubungkan data', 'Sambungkan data'], ['Add widget', 'Add widget', 'Tambah Widget', 'Tambah Widget'], ['Invite team', 'Invite team', 'Undang tim', 'Jemput pasukan'], ['View guide', 'View guide', 'Lihat panduan', 'Lihat panduan'], ['Create monitor', 'Create monitor', 'Buat monitor', 'Cipta monitor'], ['Declare incident', 'Declare incident', 'Nyatakan insiden', 'Isytiharkan insiden'], ['View logs', 'View logs', 'Lihat log', 'Lihat log'], ['Status page', 'Status page', 'Halaman status', 'Halaman status'], ['New project', 'New project', 'Project baru', 'Project baharu'], ['Add task', 'Add task', 'Tambah task', 'Tambah task'], ['Assign member', 'Assign member', 'Tetapkan anggota', 'Tetapkan ahli'], ['Sprint report', 'Sprint report', 'Laporan sprint', 'Laporan sprint'],
  ];

  const sourceToKey = new Map(entries.map((entry, index) => [entry[0], `dashboard.variant.${index}`]));
  const dictionaries = Object.fromEntries(['en', 'id', 'ms'].map((locale, localeIndex) => [locale, Object.fromEntries(entries.map((entry, index) => [`dashboard.variant.${index}`, entry[localeIndex + 1]]))]));
  const originals = new WeakMap();
  const attributeOriginals = new WeakMap();
  const attributes = ['aria-label', 'title', 'placeholder'];

  const register = () => {
    const locale = window.PADevI18n?.getLocale?.();
    if (!locale || !window.PADevI18n?.register) return;
    window.PADevI18n.register(locale, dictionaries[locale]);
    window.PADevI18n.register('en', dictionaries.en);
  };

  const apply = () => {
    const locale = window.PADevI18n?.getLocale?.() || 'en';
    const main = document.querySelector('main#konten-utama');
    if (!main) return;
    const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, { acceptNode: (node) => node.parentElement?.closest('script, style, code') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      const source = originals.get(node).trim();
      const key = sourceToKey.get(source);
      const translated = key && window.PADevI18n.t(key);
      if (translated) node.nodeValue = originals.get(node).replace(source, translated);
    });
    main.querySelectorAll(attributes.map((name) => `[${name}]`).join(',')).forEach((element) => attributes.forEach((name) => {
      const saved = attributeOriginals.get(element) || {};
      const source = saved[name] ?? element.getAttribute(name);
      if (!source) return;
      saved[name] = source;
      attributeOriginals.set(element, saved);
      const translated = window.PADevI18n.t(sourceToKey.get(source));
      if (translated) element.setAttribute(name, translated);
    }));
  };

  register();
  apply();
  document.addEventListener('padev:locale-change', () => { register(); apply(); });
  document.addEventListener('padev:locale-ready', apply);
})();
