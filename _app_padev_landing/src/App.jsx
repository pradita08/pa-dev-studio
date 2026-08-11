import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import { belahJudul, defaultContent, loadContent } from './content.js';
import { I18nProvider, LOCALES, translateContent, useI18n } from './i18n.js';

/* Isi halaman berasal dari panel admin lewat API, dengan isi bawaan sebagai
 * cadangan saat API tidak bisa dihubungi. Lihat `src/content.js`. */
const ContentContext = createContext(defaultContent);
const useContent = () => useContext(ContentContext);




const process = [
  ['01', 'process.discover.title', 'process.discover.text', '01-discover'],
  ['02', 'process.plan.title', 'process.plan.text', '02-plan'],
  ['03', 'process.design.title', 'process.design.text', '03-design'],
  ['04', 'process.develop.title', 'process.develop.text', '04-develop'],
  ['05', 'process.deploy.title', 'process.deploy.text', '05-deploy'],
  ['06', 'process.support.title', 'process.support.text', '06-support'],
];


const tech = [
  ['nextjs', 'Next.js', true], ['react', 'React'], ['typescript', 'TypeScript'],
  ['nodejs', 'Node.js'], ['tailwindcss', 'Tailwind CSS'], ['postgresql', 'PostgreSQL'],
  ['firebase', 'Firebase'], ['docker', 'Docker'], ['git', 'Git'],
  ['github', 'GitHub', true], ['vercel', 'Vercel', true], ['figma', 'Figma'],
];


const iconPaths = {
  arrow: <><path d="M5 12h14"/><path d="m14 7 5 5-5 5"/></>,
  code: <><path d="m8 9-3 3 3 3"/><path d="m16 9 3 3-3 3"/><path d="m14 5-4 14"/></>,
  layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
  api: <><path d="M8 9v6"/><path d="M16 9v6"/><path d="M4 12h16"/><rect x="3" y="5" width="18" height="14" rx="3"/></>,
  design: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
  dashboard: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 17v-5M12 17V7M16 17v-8"/></>,
  cart: <><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h3l2.5 11h10l2-7H6"/></>,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></>,
  spark: <><path d="m12 3-1.8 4.8L5 10l5.2 2.2L12 17l1.8-4.8L19 10l-5.2-2.2L12 3Z"/><path d="m5 3-.7 1.8L2.5 5.5l1.8.7L5 8l.7-1.8 1.8-.7-1.8-.7L5 3Z"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></>,
  menu: <><path d="M4 7h16M4 12h16M4 17h16"/></>,
  close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.73a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92Z"/>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/><path d="M12 14v3"/></>,
  pin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  linkedin: <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6Z"/><path d="M2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></>,
};

function Icon({ name, size = 20 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconPaths[name] || iconPaths.spark}
    </svg>
  );
}

const socialChannels = [
  ['gmail', 'Gmail'],
  ['whatsapp', 'WhatsApp'],
  ['instagram', 'Instagram'],
  ['github', 'GitHub'],
];

function SocialIcon({ name }) {
  if (name === 'gmail') {
    return <svg className="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m3.8 7 8.2 6 8.2-6"/></svg>;
  }
  if (name === 'whatsapp') {
    return <svg className="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.4-4.7A8.5 8.5 0 1 1 20.5 11.6Z"/><path d="M8.2 7.8c.4 3.6 2.4 5.7 6 6.7l1.7-1.6 2.1 1c-.3 1.7-1.4 2.6-3 2.6-4.7-.6-7.8-3.7-8.6-8.3 0-1.4.8-2.5 2.3-2.8l1.1 2.1-1.6.3Z"/></svg>;
  }
  if (name === 'instagram') {
    return <svg className="social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.4"/><circle cx="17.3" cy="6.8" r="1" fill="currentColor" stroke="none"/></svg>;
  }
  return <svg className="social-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z"/></svg>;
}

function SocialLinks() {
  return <div className="socials">{socialChannels.map(([name, label]) => <a className={`social-link social-link--${name}`} href="#contact" aria-label={label} key={name}><SocialIcon name={name}/></a>)}</div>;
}

function ArrowLink({ href, children, className = '' }) {
  return <a className={`arrow-link ${className}`} href={href}>{children}<Icon name="arrow" size={16}/></a>;
}

function SectionHeading({ eyebrow, title, text, action }) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {text && <p>{text}</p>}
      </div>
      {action}
    </div>
  );
}

function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();
  return <label className="language-switcher"><span className="sr-only">{t('language.label')}</span><select value={locale} onChange={(event) => setLocale(event.target.value)} aria-label={t('language.label')}>{LOCALES.map(({ code, label }) => <option key={code} value={code}>{code.toUpperCase()} — {label}</option>)}</select></label>;
}

function ThemeImage({ light, dark, alt, className = '', loading, decoding }) {
  return (
    <span className={`theme-asset ${className}`}>
      <img className="theme-image theme-image--light" src={light} alt={alt} loading={loading} decoding={decoding}/>
      <img className="theme-image theme-image--dark" src={dark} alt={alt} loading={loading} decoding={decoding}/>
    </span>
  );
}

function OrbitRing({ variant, duration, reverse = false }) {
  const ringRef = useRef(null);
  const dotRef = useRef(null);

  useEffect(() => {
    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return undefined;

    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const startedAt = performance.now();
    let frame = 0;

    const draw = (now) => {
      const border = Number.parseFloat(window.getComputedStyle(ring).borderTopWidth) || 0;
      const radiusX = (ring.clientWidth + border) / 2;
      const radiusY = (ring.clientHeight + border) / 2;
      const centerX = ring.clientWidth / 2;
      const centerY = ring.clientHeight / 2;
      const progress = reducedMotion ? 0 : ((now - startedAt) % duration) / duration;
      const angle = (reverse ? -1 : 1) * progress * Math.PI * 2 - Math.PI / 2;
      const x = centerX + radiusX * Math.cos(angle);
      const y = centerY + radiusY * Math.sin(angle);
      dot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      if (!reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    frame = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(frame);
  }, [duration, reverse]);

  return <div ref={ringRef} className={`orbit orbit--${variant}`} aria-hidden="true"><span ref={dotRef} className={`orbit-dot orbit-dot--${variant}`}/></div>;
}

function MarketplaceVisual({ light, dark, alt }) {
  return <ThemeImage className="asset-thumbnail marketplace-visual" light={light} dark={dark} alt={alt} loading="lazy" decoding="async"/>;
}

function ProjectVisual({ light, dark, alt }) {
  return <ThemeImage className="asset-thumbnail project-visual" light={light} dark={dark} alt={alt} loading="lazy" decoding="async"/>;
}

function InsightVisual({ light, dark, alt }) {
  return <ThemeImage className="insight-image" light={light} dark={dark} alt={alt} loading="lazy" decoding="async"/>;
}

function PublicAvatar({ user, size = 'normal' }) {
  const initials = String(user?.name || user?.email || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
  return user?.avatarUrl
    ? <img className={`public-avatar public-avatar--${size}`} src={user.avatarUrl} alt="" referrerPolicy="no-referrer" />
    : <span className={`public-avatar public-avatar--${size} public-avatar--fallback`} aria-hidden="true">{initials}</span>;
}

function PublicLoginButton({ onClick, variant = 'primary', className = '' }) {
  const { t } = useI18n();
  return <button className={`button button--${variant} public-login-button ${className}`} type="button" onClick={onClick} aria-label={t('publicAuth.login')} title={t('publicAuth.login')}><Icon name="lock" size={16}/><span>{t('publicAuth.login')}</span></button>;
}

function ProviderIcon({ provider }) {
  if (provider === 'google') {
    return <svg className="provider-icon provider-icon--google" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z"/>
      <path fill="#34A853" d="M12 21.99c2.63 0 4.84-.87 6.45-2.35l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.7-1.72-5.47-4.03H3.29v2.53A9.75 9.75 0 0 0 12 21.99Z"/>
      <path fill="#FBBC05" d="M6.53 14.08A5.86 5.86 0 0 1 6.22 12c0-.72.12-1.42.31-2.08V7.39H3.29A9.98 9.98 0 0 0 2.25 12c0 1.66.4 3.22 1.04 4.61l3.24-2.53Z"/>
      <path fill="#EA4335" d="M12 5.89c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.83 2.98 14.62 2.01 12 2.01a9.75 9.75 0 0 0-8.71 5.38l3.24 2.53C7.3 7.61 9.46 5.89 12 5.89Z"/>
    </svg>;
  }
  return <svg className="provider-icon provider-icon--github" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.62-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z"/></svg>;
}

function Header({ theme, setTheme, onOpenLogin, publicUser, onLogout }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountNotice, setAccountNotice] = useState('');
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setAccountOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('nav-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('nav-open');
    };
  }, [open]);

  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <a className="skip-link" href="#main">{t('a11y.skip')}</a>
      <div className="container header-inner">
        <a href="#home" className="brand" aria-label={t('a11y.home')}>
          <img className="logo logo--light" src="/assets/logo_padev_landscape_light.png" alt="PA DEV STUDIO" />
          <img className="logo logo--dark" src="/assets/logo_padev_landscape_dark.png" alt="PA DEV STUDIO" />
        </a>
        <nav className="desktop-nav" aria-label={t('a11y.primary')}>
          {['home', 'services', 'projects', 'templates', 'insights', 'about', 'contact'].map((item) => (
            <a key={item} className={item === 'home' ? 'active' : ''} href={`#${item}`}>{t(`nav.${item}`)}</a>
          ))}
        </nav>
        <div className="header-actions">
          <LanguageSwitcher/>
          <button className="icon-button theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={t(theme === 'dark' ? 'a11y.switchLight' : 'a11y.switchDark')}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          {publicUser ? (
            <div className="public-account">
              <button className="public-account-trigger" type="button" onClick={() => { setAccountOpen((value) => !value); setAccountNotice(''); }} aria-expanded={accountOpen} aria-haspopup="menu">
                <PublicAvatar user={publicUser}/><span className="public-account-name">{publicUser.name}</span><Icon name="arrow" size={14}/>
              </button>
              {accountOpen && <div className="public-account-menu" role="menu">
                <div className="public-account-summary"><PublicAvatar user={publicUser} size="large"/><div><strong>{publicUser.name}</strong><small>{publicUser.email}</small></div></div>
                <button type="button" role="menuitem" onClick={() => setAccountNotice(t('publicAuth.accountPending'))}>{t('publicAuth.profile')}</button>
                <button type="button" role="menuitem" onClick={() => setAccountNotice(t('publicAuth.accountPending'))}>{t('publicAuth.settings')}</button>
                {accountNotice && <p className="public-account-notice" role="status">{accountNotice}</p>}
                <button className="public-account-logout" type="button" role="menuitem" onClick={() => { setAccountOpen(false); onLogout(); }}>{t('publicAuth.logout')}</button>
              </div>}
            </div>
          ) : <PublicLoginButton className="header-cta" onClick={onOpenLogin}/>}
          <button ref={triggerRef} className="icon-button menu-button" onClick={() => setOpen(true)} aria-label={t('a11y.openMenu')} aria-expanded={open} aria-controls="mobile-menu"><Icon name="menu" /></button>
        </div>
      </div>
      <div className={`drawer-overlay ${open ? 'is-open' : ''}`} onClick={close} aria-hidden="true" />
      <aside id="mobile-menu" className={`mobile-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          <span>{t('nav.menu')}</span>
          <button className="icon-button" onClick={close} aria-label={t('a11y.closeMenu')}><Icon name="close"/></button>
        </div>
        <nav aria-label={t('a11y.mobile')}>
          {['home', 'services', 'projects', 'templates', 'insights', 'about', 'contact'].map((item) => <a key={item} href={`#${item}`} onClick={close}>{t(`nav.${item}`)}<Icon name="arrow" size={16}/></a>)}
        </nav>
        {publicUser ? <div className="mobile-account-summary"><PublicAvatar user={publicUser}/><span><strong>{publicUser.name}</strong><small>{publicUser.email}</small></span><button type="button" onClick={() => { onLogout(); close(); }}>{t('publicAuth.logout')}</button><div className="mobile-account-actions"><button type="button" onClick={() => setAccountNotice(t('publicAuth.accountPending'))}>{t('publicAuth.profile')}</button><button type="button" onClick={() => setAccountNotice(t('publicAuth.accountPending'))}>{t('publicAuth.settings')}</button></div>{accountNotice && <p className="public-account-notice" role="status">{accountNotice}</p>}</div> : <PublicLoginButton onClick={() => { onOpenLogin(); close(); }}/>}
      </aside>
    </header>
  );
}

function Hero() {
  const { homepage, companies } = useContent();
  const { t } = useI18n();
  const [awal, sorot, akhir] = belahJudul(homepage.hero_title, homepage.hero_highlight);
  return (
    <section className="hero" id="home">
      <div className="hero-glow" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="availability"><span/> {homepage.hero_eyebrow}</div>
          <h1>{awal}{sorot && <span>{sorot}</span>}{akhir}</h1>
          <p>{homepage.hero_subtitle}</p>
          <div className="button-row">
            <a className="button button--primary button--large" href={homepage.cta_primary_url}>{homepage.cta_primary_label} <Icon name="arrow"/></a>
            <a className="button button--secondary button--large" href={homepage.cta_secondary_url}>{homepage.cta_secondary_label} <Icon name="arrow"/></a>
          </div>
          <div className="benefits">
            {['hero.benefit.clean', 'hero.benefit.performance', 'hero.benefit.secure', 'hero.benefit.delivery'].map((key) => <span key={key}><Icon name="shield" size={18}/>{t(key)}</span>)}
          </div>
        </div>
        <div className="hero-visual">
          <OrbitRing variant="one" duration={15000}/><OrbitRing variant="two" duration={21000} reverse/>
          <ThemeImage light="/assets/ui/hero-device-light.png?v=2026-08-09-hero" dark="/assets/ui/hero-device-dark.png?v=2026-08-09-hero" alt={t('media.hero')}/>
        </div>
      </div>
      <div className="container trust-panel">
        <div className="company-strip"><small>{homepage.trust_note}</small><div>{(companies || []).map((company) => <a key={`${company.name}-${company.url}`} href={company.url} target="_blank" rel="noopener noreferrer">{company.name}</a>)}</div></div>
        <div className="stats-strip">
          {[['5+', 'stats.years'], ['40+', 'stats.projects'], ['20+', 'stats.clients'], ['99%', 'stats.satisfaction']].map(([value, key]) => <div key={key}><Icon name="spark"/><span><strong>{value}</strong><small>{t(key)}</small></span></div>)}
        </div>
      </div>
    </section>
  );
}

function Services() {
  const { capabilities } = useContent();
  const { t } = useI18n();
  return (
    <section className="section services" id="services">
      <div className="container services-layout">
        <div className="services-intro">
          <span className="eyebrow">{t('services.eyebrow')}</span>
          <h2>{t('services.title')}</h2>
          <p>{t('services.text')}</p>
          <ArrowLink href="#contact">{t('services.all')}</ArrowLink>
        </div>
        <div className="service-grid">
          {capabilities.map((service) => (
            <article className="card service-card" key={service.title}>
              <span className={`icon-tile icon-tile--${service.tone}`}><Icon name={service.icon}/></span>
              <h3>{service.title}</h3><p>{service.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Templates() {
  const { templates } = useContent();
  const { t } = useI18n();
  const [filter, setFilter] = useState('__all__');
  // Daftar saringan diturunkan dari tipe yang benar-benar ada, bukan daftar
  // tetap: tipe baru yang ditambahkan dari panel langsung bisa disaring, dan
  // tipe yang tidak dipakai tidak menyisakan tombol yang selalu kosong.
  const filters = ['__all__', ...Array.from(new Set(templates.map((item) => item.type).filter(Boolean)))];
  const visible = filter === '__all__' ? templates : templates.filter((item) => item.type === filter);
  return (
    <section className="section section--tight" id="templates">
      <div className="container showcase-panel">
        <SectionHeading eyebrow={t('templates.eyebrow')} title={t('templates.title')} action={<ArrowLink href="#templates">{t('templates.all')}</ArrowLink>} />
        <div className="filter-row" role="group" aria-label={t('templates.filter')}>
          {filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item === '__all__' ? t('templates.allFilter') : item}</button>)}
        </div>
        <div className="product-grid" aria-live="polite">
          {visible.map((item) => (
            <article className="card product-card" key={item.title}>
              <MarketplaceVisual light={item.light} dark={item.dark} alt={`${item.title} ${t('media.preview')}`}/>
              <div className="product-body"><div><h3>{item.title}</h3><p>{item.stack}</p></div><strong>{item.price}</strong></div>
              <button className="button button--primary button--small">{t('templates.details')}</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Projects() {
  const { projects } = useContent();
  const { t } = useI18n();
  return (
    <section className="section section--tight" id="projects">
      <div className="container showcase-panel">
        <SectionHeading eyebrow={t('projects.eyebrow')} title={t('projects.title')} action={<ArrowLink href="#projects">{t('projects.all')}</ArrowLink>} />
        <div className="project-grid">
          {projects.map((item) => (
            <article className="card project-card" key={item.title}>
              <div className="project-copy"><span className="tag">{item.tag}</span><h3>{item.title}</h3><p>{item.text}</p><div className="tag-row">{item.stack.map((tag) => <span key={tag}>{tag}</span>)}</div><ArrowLink href="#contact">{t('projects.case')}</ArrowLink></div>
              <ProjectVisual light={item.light} dark={item.dark} alt={`${item.title} ${t('media.caseStudy')}`}/>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechAndProcess() {
  const { t } = useI18n();
  return (
    <>
      <section className="section section--tight">
        <div className="container strip-panel tech-panel"><div><span className="eyebrow">{t('tech.eyebrow')}</span><h2>{t('tech.title')}</h2></div><div className="tech-list">{tech.map(([slug, name, monochrome]) => <span key={name}>{monochrome ? <ThemeImage className="tech-logo" light={`/assets/ui/tech-stack/svg-dark/${slug}.svg`} dark={`/assets/ui/tech-stack/svg-light/${slug}.svg`} alt=""/> : <img className="tech-logo" src={`/assets/ui/tech-stack/svg-color/${slug}.svg`} alt=""/>}<small>{name}</small></span>)}</div></div>
      </section>
      <section className="section section--tight" id="about">
        <div className="container strip-panel process-panel"><div className="process-title"><span className="eyebrow">{t('process.eyebrow')}</span><h2>{t('process.title')}</h2><ArrowLink href="#contact">{t('process.all')}</ArrowLink></div><ol>{process.map(([number, titleKey, textKey, icon]) => <li key={number}><ThemeImage className="process-visual" light={`/assets/ui/process/step-visuals/light/${icon.slice(3)}.png?v=2.1.1-themed-transparent`} dark={`/assets/ui/process/step-visuals/dark/${icon.slice(3)}.png?v=2.1.1-themed-transparent`} alt={`${t(titleKey)} ${t('media.process')}`} loading="lazy" decoding="async"/><div className="process-meta"><span>{number}</span><i><img src={`/assets/ui/process/svg/${icon}.svg`} alt=""/></i><div><h3>{t(titleKey)}</h3><p>{t(textKey)}</p></div></div></li>)}</ol></div>
      </section>
    </>
  );
}

function ProofPricingInsights() {
  const { testimonials, insights, plans } = useContent();
  const { t } = useI18n();
  const utama = testimonials[0];
  return (
    <section className="section">
      <div className="container proof-grid">
        <article className="card testimonial-card">
          <span className="eyebrow">{t('proof.eyebrow')}</span><div className="quote-mark">“</div><blockquote>{utama.quote}</blockquote><div className="stars">{'★'.repeat(utama.rating)}</div><div className="author"><span>{utama.name.split(' ').slice(0, 2).map((bagian) => bagian[0]).join('')}</span><div><strong>{utama.name}</strong><small>{[utama.role, utama.company].filter(Boolean).join(', ')}</small></div></div>
        </article>
        <div className="pricing-wrap">
          <span className="eyebrow">{t('pricing.eyebrow')}</span>
          <div className="pricing-grid">{plans.map((plan) => <article className={`card price-card ${plan.featured ? 'featured' : ''}`} key={plan.name}>{plan.featured && <span className="popular">{t('pricing.popular')}</span>}<h3>{plan.name}</h3><p>{plan.desc}</p><div className="price"><strong>{plan.price}</strong><small>{plan.suffix}</small></div><ul>{plan.features.map((feature) => <li key={feature}><Icon name="check" size={14}/>{feature}</li>)}</ul><a className={`button ${plan.featured ? 'button--primary' : 'button--secondary'}`} href={plan.ctaUrl}>{plan.cta}</a></article>)}</div>
        </div>
        <div className="insights-wrap" id="insights"><div className="mini-heading"><span className="eyebrow">{t('insights.eyebrow')}</span><ArrowLink href="#insights">{t('insights.all')}</ArrowLink></div><div className="insight-list">{insights.map((item) => <article className="card insight-card" key={item.title}><InsightVisual light={item.light} dark={item.dark} alt={`${item.title} ${t('media.article')}`}/><div><span className="tag">{item.category}</span><h3>{item.title}</h3><p>{item.date} · {t('insights.read')}</p></div></article>)}</div></div>
      </div>
    </section>
  );
}

function FAQNewsletter() {
  const { faqs } = useContent();
  const { t } = useI18n();
  const [open, setOpen] = useState(0);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const fieldId = useId();
  /* Pendaftaran benar-benar dikirim ke panel (modul Subscribers), bukan
   * sekadar mengganti teks di layar seperti sebelumnya. */
  const subscribe = async (event) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage(t('newsletter.invalid'));
    setMengirim(true);
    try {
      const r = await fetch('/api/subscribers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email }),
      });
      const isi = await r.json().catch(() => null);
      if (!r.ok) throw new Error(isi?.message || t('newsletter.failed'));
      setMessage(t('newsletter.thanks'));
      setEmail('');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setMengirim(false);
    }
  };
  return (
    <section className="section section--tight">
      <div className="container faq-newsletter-grid">
        <div className="card faq-card"><span className="eyebrow">{t('faq.eyebrow')}</span><h2>{t('faq.title')}</h2><div className="accordion">{faqs.map((item, index) => <div className={open === index ? 'open' : ''} key={item.question}><button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}><span>{item.question}</span><b>{open === index ? '−' : '+'}</b></button><div className="answer"><p>{item.answer}</p></div></div>)}</div></div>
        <div className="newsletter-card"><div><span className="eyebrow">{t('newsletter.eyebrow')}</span><h2>{t('newsletter.title')}</h2><p>{t('newsletter.text')}</p><form onSubmit={subscribe} noValidate><label className="sr-only" htmlFor={fieldId}>{t('newsletter.email')}</label><input id={fieldId} value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder={t('newsletter.placeholder')} aria-describedby={`${fieldId}-status`}/><button className="button button--primary" type="submit" disabled={mengirim}>{mengirim ? t('newsletter.send') : t('newsletter.subscribe')}</button></form><small id={`${fieldId}-status`} role="status">{message || t('newsletter.note')}</small></div><img src="/assets/newsletter_padev_1.png" alt=""/></div>
      </div>
    </section>
  );
}

function Contact() {
  const { capabilities, settings } = useContent();
  const { t } = useI18n();
  const [status, setStatus] = useState('');
  const [mengirim, setMengirim] = useState(false);
  /* Kiriman masuk ke modul Messages di panel. Endpoint publiknya sudah lama
   * ada dan dibatasi laju; yang belum ada hanyalah form yang memakainya. */
  const submit = async (event) => {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    if (!form.get('name') || !/^\S+@\S+\.\S+$/.test(String(form.get('email')))) {
      setStatus(t('contact.invalid'));
      return;
    }
    setMengirim(true);
    try {
      const r = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const isi = await r.json().catch(() => null);
      if (!r.ok) throw new Error(isi?.message || t('contact.failed'));
      setStatus(t('contact.thanks'));
      formEl.reset();
    } catch (error) {
      setStatus(error.message);
    } finally {
      setMengirim(false);
    }
  };
  return (
    <section className="section contact" id="contact">
      <div className="container contact-panel">
        <div className="contact-info"><span className="eyebrow">{t('contact.eyebrow')}</span><h2>{t('contact.title')}</h2><p>{t('contact.text')}</p><div className="contact-list">{[['mail', 'contact.email', settings.contact_email], ['phone', 'contact.phone', settings.contact_phone], ['pin', 'contact.location', settings.contact_address], ['clock', 'contact.availability', settings.contact_availability]].filter(([, , nilai]) => nilai).map(([icon, key, value]) => <div key={key}><span><Icon name={icon}/></span><p><strong>{t(key)}</strong><small>{value}</small></p></div>)}</div></div>
        <form className="contact-form" onSubmit={submit} noValidate><div className="form-row"><label><span>{t('contact.name')}</span><input name="name" placeholder={t('contact.name')} autoComplete="name"/></label><label><span>{t('contact.emailAddress')}</span><input name="email" placeholder={t('contact.emailAddress')} type="email" autoComplete="email"/></label></div><label><span>{t('contact.service')}</span><select name="service" defaultValue=""><option value="" disabled>{t('contact.selectService')}</option>{capabilities.map((service) => <option key={service.title}>{service.title}</option>)}</select></label><label><span>{t('contact.detail')}</span><textarea name="message" placeholder={t('contact.detailPlaceholder')} rows="5"/></label><button className="button button--primary" type="submit" disabled={mengirim}>{mengirim ? t('newsletter.send') : t('contact.send')} <Icon name="arrow"/></button><p className="form-status" role="status">{status}</p></form>
        <div className="profile-card"><img src="/assets/profile-padev-anime-contact.png" alt={t('profile.alt')}/><h3>Pradita Alfiantoni</h3><p>{t('profile.title')}<br/>{t('profile.subtitle')}</p><SocialLinks/></div>
      </div>
    </section>
  );
}

function Footer({ onOpenLogin, publicUser, onOpenAccount }) {
  const { settings, capabilities } = useContent();
  const { t } = useI18n();
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand"><ThemeImage className="footer-logo" light="/assets/logo_padev_landscape_light.png" dark="/assets/logo_padev_landscape_dark.png" alt="PA DEV STUDIO"/><p>{settings.site_tagline}</p><SocialLinks/></div>
        <div><h3>{t('nav.services')}</h3>{capabilities.slice(0, 5).map((item) => <a key={item.title} href="#services">{item.title}</a>)}</div>
        <div><h3>{t('footer.company')}</h3>{[['footer.about', '#about'], ['footer.process', '#about'], ['footer.case', '#projects'], ['footer.testimonials', '#insights'], ['footer.pricing', '#insights']].map(([key, href]) => <a key={key} href={href}>{t(key)}</a>)}</div>
        <div><h3>{t('footer.resources')}</h3>{[['footer.blog', '#insights'], ['nav.templates', '#templates'], ['faq.eyebrow', '#insights'], ['footer.guides', '#insights'], ['footer.changelog', '#insights']].map(([key, href]) => <a key={key} href={href}>{t(key)}</a>)}</div>
        <div><h3>{t('nav.contact')}</h3>{[settings.contact_email, settings.contact_phone, settings.contact_address].filter(Boolean).map((nilai) => <a key={nilai} href="#contact">{nilai}</a>)}{publicUser ? <button className="button button--secondary button--small footer-account-button" type="button" onClick={onOpenAccount}><PublicAvatar user={publicUser}/><span>{publicUser.name}</span><Icon name="arrow" size={15}/></button> : <PublicLoginButton variant="secondary" className="button--small" onClick={onOpenLogin}/>}</div>
      </div>
      <div className="container footer-bottom"><span>© 2026 {settings.site_name}. {t('footer.rights')}</span><div><a href="#home">{t('footer.privacy')}</a><a href="#home">{t('footer.terms')}</a></div></div>
    </footer>
  );
}

function PublicAuthModal({ open, mode, onModeChange, onClose, onAuthenticated, notice = '' }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: '', email: '', password: '', passwordConfirmation: '' });
  const [message, setMessage] = useState(notice);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setMessage(notice || '');
    setForm({ name: '', email: '', password: '', passwordConfirmation: '' });
    const onKey = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.classList.add('auth-modal-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('auth-modal-open');
    };
  }, [open, mode, notice, onClose]);

  if (!open) return null;

  const isRegister = mode === 'register';
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/public-auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          password_confirmation: form.passwordConfirmation,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Object.values(payload.errors || {})[0] || payload.message || t('publicAuth.failed');
        throw new Error(detail);
      }
      onAuthenticated(payload.user);
      onClose();
    } catch (error) {
      setMessage(error.message || t('publicAuth.failed'));
    } finally {
      setBusy(false);
    }
  };

  const startProvider = async (provider) => {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/public-auth/${provider}/start?probe=1`, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || t('publicAuth.failed'));
      }
      window.location.assign(`/api/public-auth/${provider}/start`);
    } catch (error) {
      setMessage(error.message || t('publicAuth.failed'));
      setBusy(false);
    }
  };

  return (
    <div className="auth-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="public-auth-title">
        <button className="auth-modal-close icon-button" type="button" onClick={onClose} aria-label={t('a11y.closeMenu')}><Icon name="close"/></button>
        <div className="auth-modal-brand"><img src="/assets/logo_padev_landscape_light.png" alt="PA DEV STUDIO" /></div>
        <span className="eyebrow">{t('publicAuth.eyebrow')}</span>
        <h2 id="public-auth-title">{isRegister ? t('publicAuth.registerTitle') : t('publicAuth.loginTitle')}</h2>
        <p className="auth-modal-subtitle">{isRegister ? t('publicAuth.registerSubtitle') : t('publicAuth.loginSubtitle')}</p>
        <div className="auth-provider-row">
          <button className="auth-provider auth-provider--google" type="button" disabled={busy} onClick={() => startProvider('google')}><span className="auth-provider-mark"><ProviderIcon provider="google"/></span>{t('publicAuth.google')}</button>
          <button className="auth-provider auth-provider--github" type="button" disabled={busy} onClick={() => startProvider('github')}><span className="auth-provider-mark auth-provider-mark--github"><ProviderIcon provider="github"/></span>{t('publicAuth.github')}</button>
        </div>
        <div className="auth-divider"><span>{t('publicAuth.or')}</span></div>
        <form className="auth-modal-form" onSubmit={submit} noValidate>
          {isRegister && <label><span>{t('publicAuth.name')}</span><input name="name" value={form.name} onChange={update('name')} autoComplete="name" required /></label>}
          <label><span>{t('publicAuth.email')}</span><input name="email" type="email" value={form.email} onChange={update('email')} autoComplete="email" required /></label>
          <label><span>{t('publicAuth.password')}</span><input name="password" type="password" value={form.password} onChange={update('password')} autoComplete={isRegister ? 'new-password' : 'current-password'} minLength={10} required /></label>
          {isRegister && <label><span>{t('publicAuth.passwordConfirmation')}</span><input name="password_confirmation" type="password" value={form.passwordConfirmation} onChange={update('passwordConfirmation')} autoComplete="new-password" minLength={10} required /></label>}
          <button className="button button--primary auth-submit" type="submit" disabled={busy}>{busy ? t('publicAuth.processing') : (isRegister ? t('publicAuth.register') : t('publicAuth.login'))} <Icon name="arrow" size={16}/></button>
          <p className="auth-modal-status" role="status" aria-live="polite">{message}</p>
        </form>
        <p className="auth-mode-switch">{isRegister ? t('publicAuth.haveAccount') : t('publicAuth.noAccount')} <button type="button" onClick={() => onModeChange(isRegister ? 'login' : 'register')}>{isRegister ? t('publicAuth.login') : t('publicAuth.register')}</button></p>
      </section>
    </div>
  );
}

function AppSurface({ content, theme, setTheme, publicUser, onOpenLogin, onLogout, authOpen, authMode, setAuthOpen, setAuthMode, onAuthenticated, authNotice }) {
  const { locale } = useI18n();
  const localizedContent = useMemo(() => translateContent(content, locale), [content, locale]);
  return (
    <ContentContext.Provider value={localizedContent}>
      <Header theme={theme} setTheme={setTheme} onOpenLogin={() => { setAuthMode('login'); setAuthOpen(true); }} publicUser={publicUser} onLogout={onLogout}/>
      <main id="main"><Hero/><Services/><Templates/><Projects/><TechAndProcess/><ProofPricingInsights/><FAQNewsletter/><Contact/></main>
      <Footer
        onOpenLogin={() => { setAuthMode('login'); setAuthOpen(true); }}
        publicUser={publicUser}
        onOpenAccount={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      />
      <PublicAuthModal open={authOpen} mode={authMode} onModeChange={setAuthMode} onClose={() => setAuthOpen(false)} onAuthenticated={onAuthenticated} notice={authNotice}/>
    </ContentContext.Provider>
  );
}

function LandingApp({ initialLoginOpen = false }) {
  /* Isi dimulai dari bawaan supaya halaman sudah utuh pada render pertama —
   * tidak ada kedipan kerangka kosong — lalu ditimpa jawaban API. */
  const [content, setContent] = useState(defaultContent);
  const [publicUser, setPublicUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(initialLoginOpen);
  const [authMode, setAuthMode] = useState('login');
  const [authNotice, setAuthNotice] = useState('');

  useEffect(() => {
    let hidup = true;
    loadContent().then((isi) => { if (hidup) setContent(isi); });
    return () => { hidup = false; };
  }, []);

  useEffect(() => {
    let hidup = true;
    const query = new URLSearchParams(window.location.search);
    const oauthError = query.get('publicAuth') === 'error';
    if (query.has('publicAuth')) window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    fetch('/api/public-auth/me', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => { if (hidup && payload?.user) setPublicUser(payload.user); })
      .catch(() => null);
    if (oauthError) {
      setAuthNotice('Login dengan provider tidak berhasil. Silakan coba lagi.');
      setAuthOpen(true);
    }
    return () => { hidup = false; };
  }, []);

  const logout = async () => {
    await fetch('/api/public-auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => null);
    setPublicUser(null);
  };

  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('padev-theme');
    return stored || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('padev-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#050914' : '#f8fafc');
  }, [theme]);

  return (
    <I18nProvider>
      <AppSurface
        content={content}
        theme={theme}
        setTheme={setTheme}
        publicUser={publicUser}
        onOpenLogin={() => { setAuthMode('login'); setAuthNotice(''); setAuthOpen(true); }}
        onLogout={logout}
        authOpen={authOpen}
        authMode={authMode}
        setAuthOpen={setAuthOpen}
        setAuthMode={setAuthMode}
        onAuthenticated={setPublicUser}
        authNotice={authNotice}
      />
    </I18nProvider>
  );
}

export default function App() {
  const isPublicLogin = ['/login', '/login/'].includes(window.location.pathname);
  return <LandingApp initialLoginOpen={isPublicLogin}/>;
}
