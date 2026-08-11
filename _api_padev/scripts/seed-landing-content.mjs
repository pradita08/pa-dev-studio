/**
 * Mengisi modul konten dan setelan dari isi landing yang sedang tayang.
 *
 * DIJALANKAN DARI HOST, BUKAN DARI DALAM CONTAINER:
 *
 *     node _api_padev/scripts/seed-landing-content.mjs
 *
 * Alasannya berkas gambar. Gambarnya milik `_app_padev_landing/public`, yang
 * memang tidak ikut ke image API — jadi skrip ini berbicara ke gateway lewat
 * HTTP persis seperti operator yang mengunggahnya lewat panel, bukan menulis
 * ke database langsung. Efeknya: seluruh validasi, penurunan izin, penamaan
 * ulang berkas, dan aturan pasangan gambar berlaku apa adanya. Menulis ke
 * database langsung akan melewati semua itu dan menghasilkan baris yang tidak
 * mungkin dibuat lewat panel.
 *
 * AMAN DIULANG: modul yang sudah berisi baris dilewati, dan setiap gambar
 * hanya diunggah sekali per proses.
 *
 * SUMBER DATANYA adalah `_app_padev_landing/src/App.jsx`. Kalau teks di sana
 * berubah, berkas ini ikut berubah — bukan sebaliknya. Landing belum membaca
 * API, jadi untuk sekarang keduanya memang dua salinan; skrip ini yang
 * memindahkan isinya ke database supaya penyambungan berikutnya tinggal
 * mengganti sumber baca landing.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const publicUi = path.join(repoRoot, '_app_padev_landing', 'public', 'assets', 'ui');

const BASE = process.env.PADEV_BASE || 'http://localhost:1080';

const bacaEnv = async () => {
  const isi = await readFile(path.join(repoRoot, '.env'), 'utf8');
  const ambil = (kunci) => isi.split('\n').find((b) => b.startsWith(`${kunci}=`))?.slice(kunci.length + 1).trim();
  return { email: ambil('ADMIN_EMAIL'), password: ambil('ADMIN_PASSWORD') };
};

let cookie = '';

const minta = async (jalur, opsi = {}) => {
  const r = await fetch(`${BASE}${jalur}`, {
    ...opsi,
    headers: {
      Accept: 'application/json',
      ...(cookie ? { cookie } : {}),
      ...(opsi.body && !(opsi.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...(opsi.headers || {}),
    },
  });
  const setCookie = r.headers.getSetCookie?.() || [];
  if (setCookie.length) cookie = setCookie.map((c) => c.split(';')[0]).join('; ');
  const isi = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${opsi.method || 'GET'} ${jalur} → ${r.status} ${JSON.stringify(isi)}`);
  return isi;
};

/* Unggahan dicatat supaya berkas yang dipakai dua baris tidak menghasilkan
 * dua salinan di volume. */
const terunggah = new Map();

const unggah = async (relatif) => {
  if (terunggah.has(relatif)) return terunggah.get(relatif);
  const absolut = path.join(publicUi, relatif);
  const data = new FormData();
  data.append('file', new Blob([await readFile(absolut)], { type: 'image/png' }), path.basename(relatif));
  const hasil = await minta('/api/admin/uploads', { method: 'POST', body: data });
  terunggah.set(relatif, hasil.url);
  return hasil.url;
};

const pasanganGambar = async (folder, nama) => ({
  image_light: await unggah(`${folder}/light/${nama}.png`),
  image_dark: await unggah(`${folder}/dark/${nama}.png`),
});

const sudahBerisi = async (modul) => {
  const { total } = await minta(`/api/admin/${modul}`);
  return total > 0;
};

const buat = async (modul, baris) => {
  await minta(`/api/admin/${modul}`, { method: 'POST', body: JSON.stringify(baris) });
};

/* ============================== Isi konten ==============================
 * Nilainya disalin apa adanya dari `_app_padev_landing/src/App.jsx`. */

const INSIGHTS = [
  ['Web Development', '10 Tips for Building Fast and SEO-Friendly Websites', '2026-05-31', 'fast-secure-websites',
    'Praktik yang benar-benar berpengaruh pada kecepatan muat dan keterbacaan mesin pencari.'],
  ['Productivity', 'Why I Love Next.js for Modern Web Apps', '2026-05-26', 'nextjs-modern-web-apps',
    'Alasan Next.js jadi pilihan bawaan untuk produk yang harus cepat tayang dan cepat diakses.'],
  ['Development', 'Developer Productivity Tools I Use Every Day', '2026-05-20', 'developer-productivity-tools',
    'Perkakas harian yang memangkas pekerjaan berulang tanpa menambah rumit.'],
];

const PROJECTS = [
  ['Dashboard', 'FinTrack Dashboard', 'Analytics dashboard for financial management.', 'Next.js, TypeScript', 'fintrack-dashboard'],
  ['E-Learning', 'EduLearn Website', 'Modern educational platform with course management.', 'React, Tailwind CSS', 'edulearn-website'],
  ['Task Management', 'TaskFlow App', 'Project management app with Kanban board.', 'React, Node.js', 'taskflow-app'],
  ['E-Commerce', 'ShopHub', 'E-commerce platform with payment integration.', 'Next.js, Stripe', 'shophub'],
];

const TEMPLATES = [
  ['SaaS Starter Kit', 'SaaS', 'Next.js, Tailwind CSS', 49, 'saas-starter-kit'],
  ['Admin Dashboard Pro', 'Dashboards', 'React, TypeScript', 59, 'admin-dashboard-pro'],
  ['E-Commerce Template', 'Web Apps', 'Next.js, Stripe', 69, 'e-commerce-template'],
  ['Portfolio Template', 'Templates', 'Next.js, MDX', 39, 'portfolio-template'],
];

/* Paket harga di landing — bukan delapan kartu kemampuan berikon, yang tetap
 * hidup di `_app_padev_landing/src/content.js` karena terikat pada ikonnya. */
const SERVICES = [
  {
    title: 'Starter', tagline: 'Perfect for small projects', price_amount: 49, currency: 'USD', price_suffix: '/project',
    deliverables: 'Up to 5 Pages, Responsive Design, Basic SEO', cta_label: 'Get Started', cta_url: '#contact',
  },
  {
    title: 'Professional', tagline: 'Best for growing businesses', price_amount: 199, currency: 'USD', price_suffix: '/project',
    deliverables: 'Up to 10 Pages, CMS Integration, SEO Optimization, 3 Revisions',
    cta_label: 'Get Started', cta_url: '#contact', is_featured: 1,
  },
  {
    title: 'Enterprise', tagline: 'For advanced solutions', price_label: 'Custom', price_suffix: 'Tailored',
    deliverables: 'Custom Features, Priority Support, Unlimited Revisions',
    cta_label: 'Contact Us', cta_url: '#contact',
  },
];

const FAQ = [
  ['What services do you offer?', 'I build websites, SaaS products, APIs, dashboards, e-commerce systems, and tailored digital experiences.'],
  ['How long does a project take?', 'A focused website commonly takes 2–6 weeks. Larger applications are planned in clear, reviewable milestones.'],
  ['Do you provide ongoing support?', 'Yes. Maintenance, monitoring, improvements, and technical support can continue after launch.'],
  ['What technologies do you use?', 'The stack is selected for the product, commonly React, Next.js, Node.js, TypeScript, PostgreSQL, and Docker.'],
  ['How do we get started?', 'Share the outcome you need, your timeline, and current constraints through the project brief below.'],
];

const TESTIMONIALS = [
  ['Rizky Pratama', 'Product Manager', 'TechCorp', 5,
    'PA DEV Studio delivered an outstanding product with great attention to detail. Highly recommended!'],
];

const COMPANIES = [
  ['go.id', 'https://go.id/'],
  ['UMKM HEBAT', 'https://umkmhebat.com/'],
  ['Digital Indonesia', 'https://digitalindonesia.id/'],
  ['TechStartup', 'https://techstartup.id/'],
  ['Innovate.ID', 'https://innovate.id/'],
];

const HOMEPAGE = {
  hero_eyebrow: 'Full-Stack Developer & Digital Problem Solver',
  hero_title: 'Engineering Ideas Into Premium Digital Products.',
  hero_highlight: 'Premium',
  hero_subtitle: 'I design and build modern websites, SaaS products, and dashboards that are fast, secure, scalable, and crafted for real business impact.',
  cta_primary_label: "Let's Work Together",
  cta_primary_url: '#contact',
  cta_secondary_label: 'View My Work',
  cta_secondary_url: '#projects',
  trust_note: 'Trusted by amazing companies',
  trust_rating: '99%',
};

const SETTINGS = {
  site_name: 'PA DEV Studio',
  site_tagline: 'Engineering Ideas Into Premium Digital Products.',
  site_description: 'PA DEV Studio membangun website, produk SaaS, API, dan dashboard yang cepat, aman, dan siap berkembang.',
  contact_email: 'hello@padevstudio.com',
  contact_phone: '+62 812 3456 7890',
  contact_address: 'Indonesia',
  contact_availability: 'Mon – Fri, 09:00 – 18:00 WIB',
  social_github: 'https://github.com/',
  social_linkedin: 'https://linkedin.com/',
  social_instagram: 'https://instagram.com/',
  maintenance_mode: 'off',
  maintenance_message: '',
};

const jalankan = async () => {
  const { email, password } = await bacaEnv();
  await minta('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  console.log(`[seed] masuk sebagai ${email}`);

  if (await sudahBerisi('articles')) console.log('[seed] articles dilewati — sudah berisi');
  else {
    let urutan = 0;
    for (const [kategori, judul, tanggal, visual, ringkas] of INSIGHTS) {
      urutan += 1;
      const gambar = await pasanganGambar('latest-insights/item-visuals', visual);
      await buat('articles', {
        title: judul, category: kategori, excerpt: ringkas,
        body: ringkas, ...gambar, status: 'published', published_at: `${tanggal} 09:00:00`,
        // Tanpa urutan eksplisit, daftar jatuh ke `id DESC` dan tampil
        // terbalik dari susunan yang dimaksud.
        position: urutan,
      });
    }
    console.log(`[seed] ${INSIGHTS.length} artikel dibuat`);
  }

  if (await sudahBerisi('projects')) console.log('[seed] projects dilewati — sudah berisi');
  else {
    let urutan = 0;
    for (const [tag, judul, teks, stack, visual] of PROJECTS) {
      urutan += 1;
      const gambar = await pasanganGambar('real-projects/item-visuals', visual);
      await buat('projects', { title: judul, tag, summary: teks, stack, ...gambar, status: 'published', position: urutan });
    }
    console.log(`[seed] ${PROJECTS.length} portfolio dibuat`);
  }

  if (await sudahBerisi('templates')) console.log('[seed] templates dilewati — sudah berisi');
  else {
    let urutan = 0;
    for (const [judul, tipe, stack, harga, visual] of TEMPLATES) {
      urutan += 1;
      const gambar = await pasanganGambar('marketplace/item-visuals', visual);
      await buat('templates', {
        title: judul, type: tipe, stack, price_amount: harga, currency: 'USD',
        ...gambar, status: 'published', position: urutan,
      });
    }
    console.log(`[seed] ${TEMPLATES.length} template dibuat`);
  }

  if (await sudahBerisi('services')) console.log('[seed] services dilewati — sudah berisi');
  else {
    let urutan = 0;
    for (const paket of SERVICES) {
      urutan += 1;
      await buat('services', { ...paket, status: 'published', position: urutan });
    }
    console.log(`[seed] ${SERVICES.length} paket layanan dibuat`);
  }

  if (await sudahBerisi('faq')) console.log('[seed] faq dilewati — sudah berisi');
  else {
    let urutan = 0;
    for (const [tanya, jawab] of FAQ) {
      urutan += 1;
      await buat('faq', { question: tanya, answer: jawab, category: 'Umum', status: 'published', position: urutan });
    }
    console.log(`[seed] ${FAQ.length} FAQ dibuat`);
  }

  if (await sudahBerisi('testimonials')) console.log('[seed] testimonials dilewati — sudah berisi');
  else {
    let urutan = 0;
    for (const [nama, jabatan, perusahaan, rating, kutipan] of TESTIMONIALS) {
      urutan += 1;
      await buat('testimonials', {
        author_name: nama, author_role: jabatan, company: perusahaan,
        rating, quote: kutipan, status: 'published', position: urutan,
      });
    }
    console.log(`[seed] ${TESTIMONIALS.length} testimoni dibuat`);
  }

  if (await sudahBerisi('companies')) console.log('[seed] companies dilewati — sudah berisi');
  else {
    let urutan = 0;
    for (const [name, url] of COMPANIES) {
      urutan += 1;
      await buat('companies', { name, url, status: 'published', position: urutan });
    }
    console.log(`[seed] ${COMPANIES.length} company dibuat`);
  }

  // Setelan selalu ditulis: bentuknya menimpa per field, bukan menambah baris,
  // jadi menjalankan ulang tidak menggandakan apa pun.
  await minta('/api/admin/settings/homepage', { method: 'PUT', body: JSON.stringify(HOMEPAGE) });
  await minta('/api/admin/settings/settings', { method: 'PUT', body: JSON.stringify(SETTINGS) });
  console.log('[seed] setelan Homepage dan Settings disimpan');
  console.log(`[seed] ${terunggah.size} gambar diunggah`);
};

jalankan().catch((error) => {
  console.error('[seed] gagal:', error.message);
  process.exit(1);
});
