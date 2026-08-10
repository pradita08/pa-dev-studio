import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const appSource = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const stylesSource = await readFile(new URL('../src/styles.scss', import.meta.url), 'utf8');
const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');

test('homepage preserves canonical section contract', () => {
  for (const section of ['home', 'services', 'templates', 'projects', 'insights', 'contact']) {
    assert.match(appSource, new RegExp(`id=["']${section}["']`));
  }
});

test('canonical final assets are referenced', () => {
  for (const asset of [
    'logo_padev_landscape_light.png',
    'logo_padev_landscape_dark.png',
    'hero-device-light.png',
    'hero-device-dark.png',
    'marketplace/item-visuals',
    'real-projects/item-visuals',
    'tech-stack/svg-color',
    'process/svg',
    'process/step-visuals',
    'latest-insights/item-visuals',
    'newsletter_padev_1.png',
    'profile-padev-anime-contact.png',
  ]) {
    assert.match(appSource, new RegExp(asset.replace('.', '\\.')));
  }
});

test('v2.1 visual components replace generated placeholders', () => {
  assert.doesNotMatch(appSource, /function DashboardArt/);
  assert.doesNotMatch(appSource, /<Icon name="spark" size={16}/);
});

test('landing theme polish remains adaptive and uses the requested social channels', () => {
  assert.match(stylesSource, /border: 1px solid var\(--newsletter-border\)/);
  assert.match(stylesSource, /select:has\(option\[value=''\]:checked\)/);
  assert.match(stylesSource, /background: var\(--footer-bg\)/);
  assert.match(appSource, /className="footer-logo" light="\/assets\/logo_padev_landscape_light\.png" dark="\/assets\/logo_padev_landscape_dark\.png"/);
  for (const channel of ['Gmail', 'WhatsApp', 'Instagram', 'GitHub']) assert.match(appSource, new RegExp(`'${channel}'`));
  for (const removed of ['aria-label="LinkedIn"', 'aria-label="X"', '>GH<']) assert.doesNotMatch(appSource, new RegExp(removed));
});

test('runtime hero images match the latest canonical light and dark pair', async () => {
  assert.match(appSource, /\?v=2\.1\.1-hero-matched/, 'hero URLs must bust the previous immutable cache');
  for (const name of ['hero-device-light.png', 'hero-device-dark.png']) {
    const [runtimeAsset, canonicalAsset] = await Promise.all([
      readFile(new URL(`../public/assets/ui/${name}`, import.meta.url)),
      readFile(new URL(`../../../01 References/padev-canonical-uiux-kit-v2/01-production-assets/illustrations/hero/${name}`, import.meta.url)),
    ]);
    assert.deepEqual(runtimeAsset, canonicalAsset, `${name} must match canonical bytes`);
  }
});

test('runtime marketplace and process theme pairs match transparent canonical assets', async () => {
  assert.match(appSource, /\?v=2\.1\.1-themed-transparent/, 'theme-aware visual URLs must bypass the immutable asset cache');
  const assets = {
    'marketplace/item-visuals': [
      'saas-starter-kit.png',
      'admin-dashboard-pro.png',
      'e-commerce-template.png',
      'portfolio-template.png',
    ],
    'process/step-visuals': [
      'discover.png',
      'plan.png',
      'design.png',
      'develop.png',
      'deploy.png',
      'support.png',
    ],
  };

  for (const [directory, names] of Object.entries(assets)) {
    for (const theme of ['light', 'dark']) {
      for (const name of names) {
        const [runtimeAsset, canonicalAsset] = await Promise.all([
          readFile(new URL(`../public/assets/ui/${directory}/${theme}/${name}`, import.meta.url)),
          readFile(new URL(`../../../01 References/padev-canonical-uiux-kit-v2/01-production-assets/components/${directory}/${theme}/${name}`, import.meta.url)),
        ]);
        assert.deepEqual(runtimeAsset, canonicalAsset, `${directory}/${theme}/${name} must match canonical bytes`);
        assert.ok([4, 6].includes(runtimeAsset[25]), `${directory}/${theme}/${name} must retain PNG alpha`);
      }
    }
  }
});

test('runtime real-project theme pairs match normalized canonical assets', async () => {
  assert.match(appSource, /\?v=2\.1\.1-real-projects-themed/, 'real-project theme URLs must bypass the immutable asset cache');
  for (const theme of ['light', 'dark']) {
    for (const name of [
      'fintrack-dashboard.png',
      'edulearn-website.png',
      'taskflow-app.png',
      'shophub.png',
    ]) {
      const [runtimeAsset, canonicalAsset] = await Promise.all([
        readFile(new URL(`../public/assets/ui/real-projects/item-visuals/${theme}/${name}`, import.meta.url)),
        readFile(new URL(`../../../01 References/padev-canonical-uiux-kit-v2/01-production-assets/components/real-projects/item-visuals/${theme}/${name}`, import.meta.url)),
      ]);
      assert.deepEqual(runtimeAsset, canonicalAsset, `${theme}/${name} must match canonical bytes`);
      if (theme === 'light') assert.ok([4, 6].includes(runtimeAsset[25]), `light/${name} must retain PNG alpha`);
    }
  }
});

test('runtime Latest Insights theme pairs match transparent canonical assets', async () => {
  assert.match(appSource, /\?v=2\.1\.1-latest-insights-themed/, 'Latest Insights URLs must bypass the immutable asset cache');
  for (const theme of ['light', 'dark']) {
    for (const name of [
      'fast-secure-websites.png',
      'nextjs-modern-web-apps.png',
      'developer-productivity-tools.png',
    ]) {
      const [runtimeAsset, canonicalAsset] = await Promise.all([
        readFile(new URL(`../public/assets/ui/latest-insights/item-visuals/${theme}/${name}`, import.meta.url)),
        readFile(new URL(`../../../01 References/padev-canonical-uiux-kit-v2/01-production-assets/components/latest-insights/item-visuals/${theme}/${name}`, import.meta.url)),
      ]);
      assert.deepEqual(runtimeAsset, canonicalAsset, `latest-insights/${theme}/${name} must match canonical bytes`);
      assert.ok([4, 6].includes(runtimeAsset[25]), `latest-insights/${theme}/${name} must retain PNG alpha`);
    }
  }
});

test('protected backend boundaries remain unavailable', () => {
  assert.match(serverSource, /\/auth/);
  assert.match(serverSource, /\/adminpanel/);
  assert.match(serverSource, /\/api/);
  assert.match(serverSource, /status\(404\)/);
});
