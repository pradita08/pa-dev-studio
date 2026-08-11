/**
 * Sumber isi landing: database lewat API, dengan isi bawaan sebagai cadangan.
 *
 * KENAPA ADA CADANGAN
 * Halaman ini adalah etalase. Kalau API sedang tidak bisa dihubungi, halaman
 * yang kosong jauh lebih buruk daripada halaman yang menampilkan isi terakhir
 * yang diketahui — pengunjung tidak tahu bedanya "belum diisi" dan "gagal
 * dimuat", yang ia lihat hanya perusahaan yang situsnya rusak. Karena itu isi
 * bawaan di berkas ini dipakai sebagai keadaan awal, lalu DITIMPA begitu
 * jawaban API tiba.
 *
 * Isi bawaan ini adalah salinan data yang sama dengan yang ditanam
 * `_api_padev/scripts/seed-landing-content.mjs`, jadi keduanya berangkat dari
 * titik yang sama dan perbedaan apa pun sesudahnya berasal dari suntingan di
 * panel admin.
 *
 * PEMETAAN BARIS API KE BENTUK YANG DIPAKAI KOMPONEN dilakukan di sini, bukan
 * di dalam komponennya, supaya JSX tidak perlu tahu nama kolom database.
 */

/* ====================== Isi bawaan (cadangan) ====================== */

const versiAset = {
  'marketplace/item-visuals': '2.1.1-themed-transparent',
  'real-projects/item-visuals': '2.1.1-real-projects-themed',
  'latest-insights/item-visuals': '2.1.1-latest-insights-themed',
};

const aset = (folder, nama) => {
  const versi = versiAset[folder] ? `?v=${versiAset[folder]}` : '';
  return {
    light: `/assets/ui/${folder}/light/${nama}.png${versi}`,
    dark: `/assets/ui/${folder}/dark/${nama}.png${versi}`,
  };
};

export const defaultContent = {
  /* Kartu kemampuan di seksi "End-to-End Digital Solutions".
   *
   * TIDAK dikelola dari panel: tiap kartu terikat pada sebuah ikon, dan
   * ikonnya adalah bagian dari identitas visual, bukan isi. Modul `Services`
   * di panel memegang PAKET HARGA — bentuk datanya berbeda. */
  capabilities: [
    { title: 'Web Development', text: 'Modern, responsive websites built with the latest tech.', icon: 'code', tone: 'blue' },
    { title: 'SaaS & Web Apps', text: 'Scalable applications that solve real business problems.', icon: 'layers', tone: 'orange' },
    { title: 'API Development', text: 'Robust, secure RESTful APIs and integrations.', icon: 'api', tone: 'cyan' },
    { title: 'UI/UX Design', text: 'Beautiful, intuitive designs that deliver great experiences.', icon: 'design', tone: 'purple' },
    { title: 'Admin Dashboards', text: 'Powerful dashboards with beautiful and intuitive UI/UX.', icon: 'dashboard', tone: 'indigo' },
    { title: 'E-Commerce', text: 'High-converting online stores with seamless experience.', icon: 'cart', tone: 'blue' },
    { title: 'Maintenance & Support', text: 'Ongoing support and improvements for your apps.', icon: 'shield', tone: 'navy' },
    { title: 'AI Solutions', text: 'Smart automation and AI integrations for growth.', icon: 'spark', tone: 'teal' },
  ],

  /* Paket harga — dikelola dari halaman Services di panel. */
  plans: [
    { name: 'Starter', desc: 'Perfect for small projects', price: '$49', suffix: '/project', features: ['Up to 5 Pages', 'Responsive Design', 'Basic SEO'], cta: 'Get Started', ctaUrl: '#contact' },
    { name: 'Professional', desc: 'Best for growing businesses', price: '$199', suffix: '/project', features: ['Up to 10 Pages', 'CMS Integration', 'SEO Optimization', '3 Revisions'], cta: 'Get Started', ctaUrl: '#contact', featured: true },
    { name: 'Enterprise', desc: 'For advanced solutions', price: 'Custom', suffix: 'Tailored', features: ['Custom Features', 'Priority Support', 'Unlimited Revisions'], cta: 'Contact Us', ctaUrl: '#contact' },
  ],

  templates: [
    { title: 'SaaS Starter Kit', stack: 'Next.js • Tailwind CSS', price: '$49', type: 'SaaS', ...aset('marketplace/item-visuals', 'saas-starter-kit') },
    { title: 'Admin Dashboard Pro', stack: 'React • TypeScript', price: '$59', type: 'Dashboards', ...aset('marketplace/item-visuals', 'admin-dashboard-pro') },
    { title: 'E-Commerce Template', stack: 'Next.js • Stripe', price: '$69', type: 'Web Apps', ...aset('marketplace/item-visuals', 'e-commerce-template') },
    { title: 'Portfolio Template', stack: 'Next.js • MDX', price: '$39', type: 'Templates', ...aset('marketplace/item-visuals', 'portfolio-template') },
  ],

  projects: [
    { tag: 'Dashboard', title: 'FinTrack Dashboard', text: 'Analytics dashboard for financial management.', stack: ['Next.js', 'TypeScript'], ...aset('real-projects/item-visuals', 'fintrack-dashboard') },
    { tag: 'E-Learning', title: 'EduLearn Website', text: 'Modern educational platform with course management.', stack: ['React', 'Tailwind CSS'], ...aset('real-projects/item-visuals', 'edulearn-website') },
    { tag: 'Task Management', title: 'TaskFlow App', text: 'Project management app with Kanban board.', stack: ['React', 'Node.js'], ...aset('real-projects/item-visuals', 'taskflow-app') },
    { tag: 'E-Commerce', title: 'ShopHub', text: 'E-commerce platform with payment integration.', stack: ['Next.js', 'Stripe'], ...aset('real-projects/item-visuals', 'shophub') },
  ],

  insights: [
    { category: 'Web Development', title: '10 Tips for Building Fast and SEO-Friendly Websites', date: 'May 31, 2026', ...aset('latest-insights/item-visuals', 'fast-secure-websites') },
    { category: 'Productivity', title: 'Why I Love Next.js for Modern Web Apps', date: 'May 26, 2026', ...aset('latest-insights/item-visuals', 'nextjs-modern-web-apps') },
    { category: 'Development', title: 'Developer Productivity Tools I Use Every Day', date: 'May 20, 2026', ...aset('latest-insights/item-visuals', 'developer-productivity-tools') },
  ],

  faqs: [
    { question: 'What services do you offer?', answer: 'I build websites, SaaS products, APIs, dashboards, e-commerce systems, and tailored digital experiences.' },
    { question: 'How long does a project take?', answer: 'A focused website commonly takes 2–6 weeks. Larger applications are planned in clear, reviewable milestones.' },
    { question: 'Do you provide ongoing support?', answer: 'Yes. Maintenance, monitoring, improvements, and technical support can continue after launch.' },
    { question: 'What technologies do you use?', answer: 'The stack is selected for the product, commonly React, Next.js, Node.js, TypeScript, PostgreSQL, and Docker.' },
    { question: 'How do we get started?', answer: 'Share the outcome you need, your timeline, and current constraints through the project brief below.' },
  ],

  testimonials: [
    { quote: 'PA DEV Studio delivered an outstanding product with great attention to detail. Highly recommended!', name: 'Rizky Pratama', role: 'Product Manager', company: 'TechCorp', rating: 5 },
  ],

  // Cadangan hanya dipakai ketika API belum berisi data. URL tetap eksplisit
  // agar setiap nama selalu menjadi tautan yang bisa dibuka pengunjung.
  companies: [
    { name: 'go.id', url: 'https://go.id/' },
    { name: 'UMKM HEBAT', url: 'https://umkmhebat.com/' },
    { name: 'Digital Indonesia', url: 'https://digitalindonesia.id/' },
    { name: 'TechStartup', url: 'https://techstartup.id/' },
    { name: 'Innovate.ID', url: 'https://innovate.id/' },
  ],

  homepage: {
    hero_eyebrow: 'Full-Stack Developer & Digital Problem Solver',
    hero_title: 'Engineering Ideas Into Premium Digital Products.',
    hero_highlight: 'Premium',
    hero_subtitle: 'I design and build modern websites, SaaS products, and dashboards that are fast, secure, scalable, and crafted for real business impact.',
    cta_primary_label: "Let's Work Together",
    cta_primary_url: '#contact',
    cta_secondary_label: 'View My Work',
    cta_secondary_url: '#projects',
    trust_note: 'Trusted by amazing companies',
  },

  settings: {
    site_name: 'PA DEV STUDIO',
    site_tagline: 'Building premium digital solutions that make an impact. Fast, secure, and scalable.',
    contact_email: 'hello@padevstudio.com',
    contact_phone: '+62 812 3456 7890',
    contact_address: 'Indonesia',
    contact_availability: 'Mon – Fri, 09:00 – 18:00 WIB',
  },
};

/* ====================== Pemetaan jawaban API ====================== */

const uang = (jumlah, mata = 'USD') => {
  const nilai = Number(jumlah || 0);
  const simbol = { USD: '$', IDR: 'Rp', EUR: '€' }[mata] || '';
  return `${simbol}${Number.isInteger(nilai) ? nilai : nilai.toFixed(2)}`;
};

const tanggal = (nilai) => (nilai
  ? new Date(nilai).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  : '');

/** Daftar dipisah koma di database, deretan label di layar. */
const daftar = (teks) => String(teks || '').split(',').map((b) => b.trim()).filter(Boolean);

const petakan = {
  /* Harga berupa teks menang atas angkanya: "Custom" tidak bisa dinyatakan
   * sebagai bilangan, dan memaksakannya menghasilkan "$0". */
  plans: (rows) => rows.map((r) => ({
    name: r.title,
    desc: r.tagline || '',
    price: r.price_label || uang(r.price_amount, r.currency),
    suffix: r.price_suffix || '',
    features: daftar(r.deliverables),
    cta: r.cta_label || 'Get Started',
    ctaUrl: r.cta_url || '#contact',
    featured: Number(r.is_featured) === 1,
  })),
  templates: (rows) => rows.map((r) => ({
    title: r.title, stack: daftar(r.stack).join(' • '), price: uang(r.price_amount, r.currency),
    type: r.type, light: r.image_light, dark: r.image_dark,
  })),
  projects: (rows) => rows.map((r) => ({
    tag: r.tag, title: r.title, text: r.summary || '', stack: daftar(r.stack),
    light: r.image_light, dark: r.image_dark,
  })),
  insights: (rows) => rows.map((r) => ({
    category: r.category, title: r.title, date: tanggal(r.published_at),
    light: r.image_light, dark: r.image_dark,
  })),
  faqs: (rows) => rows.map((r) => ({ question: r.question, answer: r.answer })),
  testimonials: (rows) => rows.map((r) => ({
    quote: r.quote, name: r.author_name, role: r.author_role, company: r.company, rating: Number(r.rating) || 5,
  })),
  companies: (rows) => rows.map((r) => ({ name: r.name, url: r.url })),
};

const ambil = async (jalur) => {
  const r = await fetch(jalur, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`${jalur} → ${r.status}`);
  return r.json();
};

/**
 * Memuat seluruh isi landing.
 *
 * Setiap bagian ditangani sendiri-sendiri: satu modul yang gagal atau masih
 * kosong tidak boleh menjatuhkan bagian lain, jadi yang gagal cukup tetap
 * memakai isi bawaannya. Modul yang berhasil TETAPI kosong juga dianggap
 * "tidak ada yang bisa ditampilkan" dan memakai bawaan — halaman yang
 * kehilangan seluruh seksinya karena tabel belum diisi terlihat rusak, bukan
 * terlihat baru.
 */
export const loadContent = async () => {
  const hasil = { ...defaultContent };

  const bagian = [
    ['plans', '/api/content/services'],
    ['templates', '/api/content/templates'],
    ['projects', '/api/content/projects'],
    ['insights', '/api/content/articles'],
    ['faqs', '/api/content/faq'],
    ['testimonials', '/api/content/testimonials'],
    ['companies', '/api/content/companies'],
  ];

  await Promise.all(bagian.map(async ([nama, jalur]) => {
    try {
      const { data } = await ambil(jalur);
      if (Array.isArray(data) && data.length > 0) hasil[nama] = petakan[nama](data);
    } catch (_) { /* pakai bawaan */ }
  }));

  await Promise.all(['homepage', 'settings'].map(async (grup) => {
    try {
      const { data } = await ambil(`/api/content/settings/${grup}`);
      // Field kosong di panel TIDAK menimpa bawaan: mengosongkan sebuah field
      // hampir selalu berarti "belum diisi", bukan "tampilkan kosong".
      const terisi = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => String(v || '').trim() !== ''));
      hasil[grup] = { ...hasil[grup], ...terisi };
    } catch (_) { /* pakai bawaan */ }
  }));

  return hasil;
};

/** Memecah judul hero pada kata yang ditonjolkan, untuk dibungkus <span>. */
export const belahJudul = (judul, sorot) => {
  const teks = String(judul || '');
  const kata = String(sorot || '').trim();
  const posisi = kata ? teks.indexOf(kata) : -1;
  if (posisi === -1) return [teks, '', ''];
  return [teks.slice(0, posisi), kata, teks.slice(posisi + kata.length)];
};
