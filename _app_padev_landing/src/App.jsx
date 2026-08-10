import { useEffect, useId, useRef, useState } from 'react';

const services = [
  { icon: 'code', title: 'Web Development', text: 'Modern, responsive websites built with the latest tech.', tone: 'blue' },
  { icon: 'layers', title: 'SaaS & Web Apps', text: 'Scalable applications that solve real business problems.', tone: 'orange' },
  { icon: 'api', title: 'API Development', text: 'Robust, secure RESTful APIs and integrations.', tone: 'cyan' },
  { icon: 'design', title: 'UI/UX Design', text: 'Beautiful, intuitive designs that deliver great experiences.', tone: 'purple' },
  { icon: 'dashboard', title: 'Admin Dashboards', text: 'Powerful dashboards with beautiful and intuitive UI/UX.', tone: 'indigo' },
  { icon: 'cart', title: 'E-Commerce', text: 'High-converting online stores with seamless experience.', tone: 'blue' },
  { icon: 'shield', title: 'Maintenance & Support', text: 'Ongoing support and improvements for your apps.', tone: 'navy' },
  { icon: 'spark', title: 'AI Solutions', text: 'Smart automation and AI integrations for growth.', tone: 'teal' },
];

const templates = [
  { title: 'SaaS Starter Kit', stack: 'Next.js • Tailwind CSS', price: '$49', type: 'SaaS', visual: 'saas-starter-kit' },
  { title: 'Admin Dashboard Pro', stack: 'React • TypeScript', price: '$59', type: 'Dashboards', visual: 'admin-dashboard-pro' },
  { title: 'E-Commerce Template', stack: 'Next.js • Stripe', price: '$69', type: 'Web Apps', visual: 'e-commerce-template' },
  { title: 'Portfolio Template', stack: 'Next.js • MDX', price: '$39', type: 'Templates', visual: 'portfolio-template' },
];

const projects = [
  { tag: 'Dashboard', title: 'FinTrack Dashboard', text: 'Analytics dashboard for financial management.', stack: ['Next.js', 'TypeScript'], visual: 'fintrack-dashboard' },
  { tag: 'E-Learning', title: 'EduLearn Website', text: 'Modern educational platform with course management.', stack: ['React', 'Tailwind CSS'], visual: 'edulearn-website' },
  { tag: 'Task Management', title: 'TaskFlow App', text: 'Project management app with Kanban board.', stack: ['React', 'Node.js'], visual: 'taskflow-app' },
  { tag: 'E-Commerce', title: 'ShopHub', text: 'E-commerce platform with payment integration.', stack: ['Next.js', 'Stripe'], visual: 'shophub' },
];

const process = [
  ['01', 'Discover', 'Understand your goals & requirements.', '01-discover'],
  ['02', 'Plan', 'Research, architecture & project roadmap.', '02-plan'],
  ['03', 'Design', 'UI/UX design & prototyping.', '03-design'],
  ['04', 'Develop', 'Build, test & implement clean code.', '04-develop'],
  ['05', 'Deploy', 'Launch, monitor & optimise.', '05-deploy'],
  ['06', 'Support', 'Ongoing support & improvements.', '06-support'],
];

const insights = [
  ['Web Development', '10 Tips for Building Fast and SEO-Friendly Websites', 'May 31, 2026', 'fast-secure-websites'],
  ['Productivity', 'Why I Love Next.js for Modern Web Apps', 'May 26, 2026', 'nextjs-modern-web-apps'],
  ['Development', 'Developer Productivity Tools I Use Every Day', 'May 20, 2026', 'developer-productivity-tools'],
];

const tech = [
  ['nextjs', 'Next.js', true], ['react', 'React'], ['typescript', 'TypeScript'],
  ['nodejs', 'Node.js'], ['tailwindcss', 'Tailwind CSS'], ['postgresql', 'PostgreSQL'],
  ['firebase', 'Firebase'], ['docker', 'Docker'], ['git', 'Git'],
  ['github', 'GitHub', true], ['vercel', 'Vercel', true], ['figma', 'Figma'],
];

const faqs = [
  ['What services do you offer?', 'I build websites, SaaS products, APIs, dashboards, e-commerce systems, and tailored digital experiences.'],
  ['How long does a project take?', 'A focused website commonly takes 2–6 weeks. Larger applications are planned in clear, reviewable milestones.'],
  ['Do you provide ongoing support?', 'Yes. Maintenance, monitoring, improvements, and technical support can continue after launch.'],
  ['What technologies do you use?', 'The stack is selected for the product, commonly React, Next.js, Node.js, TypeScript, PostgreSQL, and Docker.'],
  ['How do we get started?', 'Share the outcome you need, your timeline, and current constraints through the project brief below.'],
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

function ThemeImage({ light, dark, alt, className = '', loading, decoding }) {
  return (
    <span className={`theme-asset ${className}`}>
      <img className="theme-image theme-image--light" src={light} alt={alt} loading={loading} decoding={decoding}/>
      <img className="theme-image theme-image--dark" src={dark} alt={alt} loading={loading} decoding={decoding}/>
    </span>
  );
}

function MarketplaceVisual({ visual, alt }) {
  return <ThemeImage className="asset-thumbnail marketplace-visual" light={`/assets/ui/marketplace/item-visuals/light/${visual}.png?v=2.1.1-themed-transparent`} dark={`/assets/ui/marketplace/item-visuals/dark/${visual}.png?v=2.1.1-themed-transparent`} alt={alt} loading="lazy" decoding="async"/>;
}

function ProjectVisual({ visual, alt }) {
  return <ThemeImage className="asset-thumbnail project-visual" light={`/assets/ui/real-projects/item-visuals/light/${visual}.png?v=2.1.1-real-projects-themed`} dark={`/assets/ui/real-projects/item-visuals/dark/${visual}.png?v=2.1.1-real-projects-themed`} alt={alt} loading="lazy" decoding="async"/>;
}

function InsightVisual({ visual, alt }) {
  return <ThemeImage className="insight-image" light={`/assets/ui/latest-insights/item-visuals/light/${visual}.png?v=2.1.1-latest-insights-themed`} dark={`/assets/ui/latest-insights/item-visuals/dark/${visual}.png?v=2.1.1-latest-insights-themed`} alt={alt} loading="lazy" decoding="async"/>;
}

function Header({ theme, setTheme }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
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
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="container header-inner">
        <a href="#home" className="brand" aria-label="PA DEV STUDIO home">
          <img className="logo logo--light" src="/assets/logo_padev_landscape_light.png" alt="PA DEV STUDIO" />
          <img className="logo logo--dark" src="/assets/logo_padev_landscape_dark.png" alt="PA DEV STUDIO" />
        </a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {['Home', 'Services', 'Projects', 'Templates', 'Insights', 'About', 'Contact'].map((item) => (
            <a key={item} className={item === 'Home' ? 'active' : ''} href={`#${item.toLowerCase()}`}>{item}</a>
          ))}
        </nav>
        <div className="header-actions">
          <button className="icon-button theme-toggle" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <a className="button button--primary header-cta" href="#contact">Let&apos;s Talk <Icon name="arrow" size={16}/></a>
          <button ref={triggerRef} className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="mobile-menu"><Icon name="menu" /></button>
        </div>
      </div>
      <div className={`drawer-overlay ${open ? 'is-open' : ''}`} onClick={close} aria-hidden="true" />
      <aside id="mobile-menu" className={`mobile-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="drawer-head">
          <span>Menu</span>
          <button className="icon-button" onClick={close} aria-label="Close menu"><Icon name="close"/></button>
        </div>
        <nav aria-label="Mobile navigation">
          {['Home', 'Services', 'Projects', 'Templates', 'Insights', 'About', 'Contact'].map((item) => <a key={item} href={`#${item.toLowerCase()}`} onClick={close}>{item}<Icon name="arrow" size={16}/></a>)}
        </nav>
        <a className="button button--primary" href="#contact" onClick={close}>Let&apos;s Talk <Icon name="arrow" size={16}/></a>
      </aside>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-glow" aria-hidden="true" />
      <div className="container hero-grid">
        <div className="hero-copy">
          <div className="availability"><span/> Full-Stack Developer & Digital Problem Solver</div>
          <h1>Engineering Ideas Into <span>Premium</span> Digital Products.</h1>
          <p>I design and build modern websites, SaaS products, and dashboards that are fast, secure, scalable, and crafted for real business impact.</p>
          <div className="button-row">
            <a className="button button--primary button--large" href="#contact">Let&apos;s Work Together <Icon name="arrow"/></a>
            <a className="button button--secondary button--large" href="#projects">View My Work <Icon name="arrow"/></a>
          </div>
          <div className="benefits">
            {['Clean Code · Scalable', 'Performance · Optimized', 'Secure · Reliable', 'On-Time · Delivery'].map((item) => <span key={item}><Icon name="shield" size={18}/>{item}</span>)}
          </div>
        </div>
        <div className="hero-visual">
          <div className="orbit orbit--one"/><div className="orbit orbit--two"/>
          <ThemeImage light="/assets/ui/hero-device-light.png?v=2026-08-09-hero" dark="/assets/ui/hero-device-dark.png?v=2026-08-09-hero" alt="PA DEV dashboard shown on laptop and mobile devices"/>
        </div>
      </div>
      <div className="container trust-panel">
        <div className="company-strip"><small>Trusted by amazing companies</small><div><b>go.id</b><b>UMKM HEBAT</b><b>Digital Indonesia</b><b>TechStartup</b><b>Innovate.ID</b></div></div>
        <div className="stats-strip">
          {[['5+', 'Years Experience'], ['40+', 'Projects Completed'], ['20+', 'Happy Clients'], ['99%', 'Client Satisfaction']].map(([value, label]) => <div key={label}><Icon name="spark"/><span><strong>{value}</strong><small>{label}</small></span></div>)}
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section className="section services" id="services">
      <div className="container services-layout">
        <div className="services-intro">
          <span className="eyebrow">Services</span>
          <h2>End-to-End Digital Solutions.</h2>
          <p>From strategy and design to development and deployment, I deliver reliable solutions that drive growth.</p>
          <ArrowLink href="#contact">View all services</ArrowLink>
        </div>
        <div className="service-grid">
          {services.map((service) => (
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
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'SaaS', 'Web Apps', 'Dashboards', 'E-Commerce'];
  const visible = filter === 'All' ? templates : templates.filter((item) => item.type === filter || (filter === 'E-Commerce' && item.title.startsWith('E-Commerce')));
  return (
    <section className="section section--tight" id="templates">
      <div className="container showcase-panel">
        <SectionHeading eyebrow="Templates Marketplace" title="Launch faster with premium templates." action={<ArrowLink href="#templates">View all templates</ArrowLink>} />
        <div className="filter-row" role="group" aria-label="Filter templates">
          {filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}
        </div>
        <div className="product-grid" aria-live="polite">
          {visible.map((item) => (
            <article className="card product-card" key={item.title}>
              <MarketplaceVisual visual={item.visual} alt={`${item.title} interface preview`}/>
              <div className="product-body"><div><h3>{item.title}</h3><p>{item.stack}</p></div><strong>{item.price}</strong></div>
              <button className="button button--primary button--small">View Details</button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Projects() {
  return (
    <section className="section section--tight" id="projects">
      <div className="container showcase-panel">
        <SectionHeading eyebrow="Featured Case Studies" title="Real projects. Real impact." action={<ArrowLink href="#projects">View all projects</ArrowLink>} />
        <div className="project-grid">
          {projects.map((item) => (
            <article className="card project-card" key={item.title}>
              <div className="project-copy"><span className="tag">{item.tag}</span><h3>{item.title}</h3><p>{item.text}</p><div className="tag-row">{item.stack.map((tag) => <span key={tag}>{tag}</span>)}</div><ArrowLink href="#contact">View Case Study</ArrowLink></div>
              <ProjectVisual visual={item.visual} alt={`${item.title} case study interface`}/>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechAndProcess() {
  return (
    <>
      <section className="section section--tight">
        <div className="container strip-panel tech-panel"><div><span className="eyebrow">Tech Stack</span><h2>Modern technologies for modern solutions.</h2></div><div className="tech-list">{tech.map(([slug, name, monochrome]) => <span key={name}>{monochrome ? <ThemeImage className="tech-logo" light={`/assets/ui/tech-stack/svg-dark/${slug}.svg`} dark={`/assets/ui/tech-stack/svg-light/${slug}.svg`} alt=""/> : <img className="tech-logo" src={`/assets/ui/tech-stack/svg-color/${slug}.svg`} alt=""/>}<small>{name}</small></span>)}</div></div>
      </section>
      <section className="section section--tight" id="about">
        <div className="container strip-panel process-panel"><div className="process-title"><span className="eyebrow">My Process</span><h2>A clear process for great results.</h2><ArrowLink href="#contact">View how it works</ArrowLink></div><ol>{process.map(([number, title, text, icon]) => <li key={number}><ThemeImage className="process-visual" light={`/assets/ui/process/step-visuals/light/${icon.slice(3)}.png?v=2.1.1-themed-transparent`} dark={`/assets/ui/process/step-visuals/dark/${icon.slice(3)}.png?v=2.1.1-themed-transparent`} alt={`${title} process illustration`} loading="lazy" decoding="async"/><div className="process-meta"><span>{number}</span><i><img src={`/assets/ui/process/svg/${icon}.svg`} alt=""/></i><div><h3>{title}</h3><p>{text}</p></div></div></li>)}</ol></div>
      </section>
    </>
  );
}

function ProofPricingInsights() {
  const plans = [
    { name: 'Starter', desc: 'Perfect for small projects', price: '$49', suffix: '/project', features: ['Up to 5 Pages', 'Responsive Design', 'Basic SEO'], cta: 'Get Started' },
    { name: 'Professional', desc: 'Best for growing businesses', price: '$199', suffix: '/project', features: ['Up to 10 Pages', 'CMS Integration', 'SEO Optimization', '3 Revisions'], cta: 'Get Started', featured: true },
    { name: 'Enterprise', desc: 'For advanced solutions', price: 'Custom', suffix: 'Tailored', features: ['Custom Features', 'Priority Support', 'Unlimited Revisions'], cta: 'Contact Us' },
  ];
  return (
    <section className="section">
      <div className="container proof-grid">
        <article className="card testimonial-card">
          <span className="eyebrow">What Clients Say</span><div className="quote-mark">“</div><blockquote>PA DEV Studio delivered an outstanding product with great attention to detail. Highly recommended!</blockquote><div className="stars">★★★★★</div><div className="author"><span>RP</span><div><strong>Rizky Pratama</strong><small>Product Manager, TechCorp</small></div></div>
        </article>
        <div className="pricing-wrap">
          <span className="eyebrow">Pricing Plans</span>
          <div className="pricing-grid">{plans.map((plan) => <article className={`card price-card ${plan.featured ? 'featured' : ''}`} key={plan.name}>{plan.featured && <span className="popular">Most Popular</span>}<h3>{plan.name}</h3><p>{plan.desc}</p><div className="price"><strong>{plan.price}</strong><small>{plan.suffix}</small></div><ul>{plan.features.map((feature) => <li key={feature}><Icon name="check" size={14}/>{feature}</li>)}</ul><a className={`button ${plan.featured ? 'button--primary' : 'button--secondary'}`} href="#contact">{plan.cta}</a></article>)}</div>
        </div>
        <div className="insights-wrap" id="insights"><div className="mini-heading"><span className="eyebrow">Latest Insights</span><ArrowLink href="#insights">View all articles</ArrowLink></div><div className="insight-list">{insights.map(([category, title, date, visual]) => <article className="card insight-card" key={title}><InsightVisual visual={visual} alt={`${title} article illustration`}/><div><span className="tag">{category}</span><h3>{title}</h3><p>{date} · 5 min read</p></div></article>)}</div></div>
      </div>
    </section>
  );
}

function FAQNewsletter() {
  const [open, setOpen] = useState(0);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const fieldId = useId();
  const subscribe = (event) => {
    event.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMessage('Please enter a valid email address.');
    setMessage('Thanks — you are on the list!');
    setEmail('');
  };
  return (
    <section className="section section--tight">
      <div className="container faq-newsletter-grid">
        <div className="card faq-card"><span className="eyebrow">FAQ</span><h2>Questions? We&apos;ve got answers.</h2><div className="accordion">{faqs.map(([question, answer], index) => <div className={open === index ? 'open' : ''} key={question}><button onClick={() => setOpen(open === index ? -1 : index)} aria-expanded={open === index}><span>{question}</span><b>{open === index ? '−' : '+'}</b></button><div className="answer"><p>{answer}</p></div></div>)}</div></div>
        <div className="newsletter-card"><div><span className="eyebrow">Stay Updated</span><h2>Get tips, insights, and resources straight to your inbox.</h2><p>Join 500+ developers and business owners.</p><form onSubmit={subscribe} noValidate><label className="sr-only" htmlFor={fieldId}>Email address</label><input id={fieldId} value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Enter your email address" aria-describedby={`${fieldId}-status`}/><button className="button button--primary" type="submit">Subscribe</button></form><small id={`${fieldId}-status`} role="status">{message || 'No spam. Unsubscribe anytime.'}</small></div><img src="/assets/newsletter_padev_1.png" alt=""/></div>
      </div>
    </section>
  );
}

function Contact() {
  const [status, setStatus] = useState('');
  const submit = (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get('name') || !/^\S+@\S+\.\S+$/.test(String(form.get('email')))) {
      setStatus('Please complete your name and a valid email address.');
      return;
    }
    setStatus('Project brief is ready. Copy these details into your preferred contact channel.');
    event.currentTarget.reset();
  };
  return (
    <section className="section contact" id="contact">
      <div className="container contact-panel">
        <div className="contact-info"><span className="eyebrow">Let&apos;s Work Together</span><h2>Have a project in mind?</h2><p>Let&apos;s build something amazing together.</p><div className="contact-list">{[["mail", 'Email', 'hello@padevstudio.com'], ['phone', 'Phone / WhatsApp', '+62 812 3456 7890'], ['pin', 'Location', 'Indonesia'], ['clock', 'Availability', 'Mon – Fri, 09:00 – 18:00 WIB']].map(([icon, label, value]) => <div key={label}><span><Icon name={icon}/></span><p><strong>{label}</strong><small>{value}</small></p></div>)}</div></div>
        <form className="contact-form" onSubmit={submit} noValidate><div className="form-row"><label><span>Your Name</span><input name="name" placeholder="Your Name" autoComplete="name"/></label><label><span>Email Address</span><input name="email" placeholder="Email Address" type="email" autoComplete="email"/></label></div><label><span>Service</span><select name="service" defaultValue=""><option value="" disabled>Select Service</option>{services.map((service) => <option key={service.title}>{service.title}</option>)}</select></label><label><span>Project Detail</span><textarea name="message" placeholder="Tell me about your project..." rows="5"/></label><button className="button button--primary" type="submit">Send Message <Icon name="arrow"/></button><p className="form-status" role="status">{status}</p></form>
        <div className="profile-card"><img src="/assets/profile-padev-anime-contact.png" alt="Anime portrait of Pradita Alfiantoni, Full-Stack Developer and Digital Problem Solver"/><h3>Pradita Alfiantoni</h3><p>Full-Stack Developer &<br/>Digital Problem Solver</p><SocialLinks/></div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-brand"><ThemeImage className="footer-logo" light="/assets/logo_padev_landscape_light.png" dark="/assets/logo_padev_landscape_dark.png" alt="PA DEV STUDIO"/><p>Building premium digital solutions that make an impact. Fast, secure, and scalable.</p><SocialLinks/></div>
        <div><h3>Services</h3>{['Web Development', 'SaaS & Web Apps', 'API Development', 'UI/UX Design', 'AI Solutions'].map((item) => <a key={item} href="#services">{item}</a>)}</div>
        <div><h3>Company</h3>{['About Me', 'My Process', 'Case Studies', 'Testimonials', 'Pricing'].map((item) => <a key={item} href="#about">{item}</a>)}</div>
        <div><h3>Resources</h3>{['Blog & Insights', 'Templates', 'FAQ', 'Guides', 'Changelog'].map((item) => <a key={item} href="#insights">{item}</a>)}</div>
        <div><h3>Contact</h3><a href="#contact">hello@padevstudio.com</a><a href="#contact">+62 812 3456 7890</a><a href="#contact">Indonesia</a><a className="button button--secondary button--small" href="#contact">Let&apos;s Talk <Icon name="arrow" size={15}/></a></div>
      </div>
      <div className="container footer-bottom"><span>© 2026 PA DEV STUDIO. All rights reserved.</span><div><a href="#home">Privacy Policy</a><a href="#home">Terms of Service</a></div></div>
    </footer>
  );
}

export default function App() {
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
    <>
      <Header theme={theme} setTheme={setTheme}/>
      <main id="main"><Hero/><Services/><Templates/><Projects/><TechAndProcess/><ProofPricingInsights/><FAQNewsletter/><Contact/></main>
      <Footer/>
    </>
  );
}
