/**
 * Audit wp-admin in sola lettura: login, Site Health, temi, plugin, file del child theme (se l'editor è attivo).
 * Non salva né modifica nulla in WordPress.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnv, requireEnv, outDir, writeJson, httpCredentials } from './lib.mjs';

loadEnv();
requireEnv(['WP_BASE_URL', 'WP_USER', 'WP_PASS']);
const BASE = process.env.WP_BASE_URL.replace(/\/+$/, '');
const out = outDir('wpadmin');
const shots = outDir('wpadmin/screenshots');
const childDir = outDir('wpadmin/child-theme');

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, httpCredentials: httpCredentials() });
const page = await context.newPage();

async function shot(name) { await page.screenshot({ path: resolve(shots, `${name}.png`), fullPage: true }); }

// Login
await page.goto(`${BASE}/wp-login.php`, { waitUntil: 'domcontentloaded' });
await page.fill('#user_login', process.env.WP_USER);
await page.fill('#user_pass', process.env.WP_PASS);
await Promise.all([page.waitForNavigation({ waitUntil: 'domcontentloaded' }), page.click('#wp-submit')]);
if (page.url().includes('wp-login.php')) {
  await shot('login-failed');
  console.error('Login fallito. Controlla WP_USER/WP_PASS. Screenshot in output/wpadmin/screenshots/login-failed.png');
  await browser.close();
  process.exit(1);
}
console.log('Login ok');

// Site Health → Info (testo copiabile completo)
await page.goto(`${BASE}/wp-admin/site-health.php?tab=debug`, { waitUntil: 'networkidle' });
await shot('site-health');
const health = await page.evaluate(() => {
  const sections = [];
  for (const h of document.querySelectorAll('.health-check-accordion-heading')) {
    const title = h.textContent.trim().replace(/\s+/g, ' ');
    const panel = h.closest('.health-check-accordion')?.querySelector(`#${h.querySelector('button')?.getAttribute('aria-controls')}`);
    const rows = panel ? [...panel.querySelectorAll('tr')].map((tr) => [...tr.children].map((c) => c.textContent.trim().replace(/\s+/g, ' ')).join(': ')) : [];
    sections.push(`## ${title}\n${rows.join('\n')}`);
  }
  return sections.join('\n\n');
});
writeFileSync(resolve(out, 'site-health.txt'), health);

// Temi
await page.goto(`${BASE}/wp-admin/themes.php`, { waitUntil: 'networkidle' });
await shot('themes');
const themes = await page.evaluate(() => (window._wpThemeSettings?.themes || []).map((t) => ({
  id: t.id, name: t.name, version: t.version, author: t.author?.replace(/<[^>]+>/g, ''), parent: t.parent || null, active: !!t.active, hasUpdate: !!t.hasUpdate,
})));
writeJson(resolve(out, 'themes.json'), themes);
const active = themes.find((t) => t.active);
console.log(`Tema attivo: ${active?.name} ${active?.version}${active?.parent ? ` (child di ${active.parent})` : ''}`);

// Plugin
await page.goto(`${BASE}/wp-admin/plugins.php?plugin_status=all`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForLoadState('networkidle');
await shot('plugins');
const plugins = await page.evaluate(() => [...document.querySelectorAll('#the-list tr[data-slug]')].map((tr) => ({
  slug: tr.dataset.slug,
  name: tr.querySelector('.plugin-title strong')?.textContent.trim(),
  active: tr.classList.contains('active'),
  version: tr.querySelector('.plugin-version-author-uri')?.textContent.match(/Version[e]?\s+([\d.]+)/)?.[1] ?? null,
  hasUpdate: tr.classList.contains('update'),
})));
writeJson(resolve(out, 'plugins.json'), plugins);
console.log(`Plugin: ${plugins.length} totali, ${plugins.filter((p) => p.active).length} attivi`);

// Impostazioni lettura e permalink
const settings = {};
await page.goto(`${BASE}/wp-admin/options-reading.php`, { waitUntil: 'networkidle' });
settings.showOnFront = await page.evaluate(() => document.querySelector('input[name=show_on_front]:checked')?.value);
settings.pageOnFront = await page.evaluate(() => document.querySelector('#page_on_front option:checked')?.textContent.trim());
await page.goto(`${BASE}/wp-admin/options-permalink.php`, { waitUntil: 'networkidle' });
settings.permalink = await page.evaluate(() => document.querySelector('#permalink_structure')?.value || document.querySelector('input[name=selection]:checked')?.value);
writeJson(resolve(out, 'settings.json'), settings);

// Editor del tema: file del child (solo lettura)
if (active) {
  await page.goto(`${BASE}/wp-admin/theme-editor.php?theme=${encodeURIComponent(active.id)}`, { waitUntil: 'networkidle' });
  await shot('theme-editor');
  const disabled = await page.evaluate(() => !document.querySelector('#templateside'));
  if (disabled) {
    console.log('Editor del tema disabilitato (DISALLOW_FILE_EDIT): esportare i file del child via SFTP o zip.');
  } else {
    const files = await page.evaluate(() => [...document.querySelectorAll('#templateside a')].map((a) => ({ label: a.textContent.trim(), href: a.href })));
    writeJson(resolve(childDir, 'files.json'), files);
    for (const f of files.filter((f) => /\.(css|php)$/.test(f.label) && !/\/(inc|vendor|node_modules)\//.test(f.label))) {
      await page.goto(f.href, { waitUntil: 'networkidle' });
      const content = await page.evaluate(() => document.querySelector('#newcontent')?.value ?? '');
      const safe = f.label.replace(/^.*\(/, '').replace(/\)$/, '').replace(/[^a-z0-9._-]+/gi, '_');
      writeFileSync(resolve(childDir, safe), content);
    }
    console.log(`File del child salvati in ${childDir}`);
  }
}

await browser.close();
console.log(`Output in ${out}`);
