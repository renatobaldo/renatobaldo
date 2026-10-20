/**
 * Audit front-end in sola lettura.
 * Per ogni URL: screenshot a più larghezze, inventario CSS/JS, CSS inutilizzato, metriche, HTML.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, requireEnv, outDir, writeJson, slug, httpCredentials, readUrls, passSiteGroundChallenge, UA_DESKTOP, UA_MOBILE } from './lib.mjs';

loadEnv();
requireEnv(['WP_BASE_URL']);
const BASE = process.env.WP_BASE_URL.replace(/\/+$/, '');
const here = dirname(fileURLToPath(import.meta.url));
const urls = readUrls(process.env.AUDIT_URLS ? resolve(process.env.AUDIT_URLS) : resolve(here, 'urls.txt')).map((p) => (p.startsWith('http') ? p : BASE + p));
const WIDTHS = [360, 390, 768, 1024, 1440];

const out = outDir('frontend');
const shots = outDir('frontend/screenshots');
const htmlDir = outDir('frontend/html');

const browser = await chromium.launch();
const results = [];
let cookies = []; // cookie della challenge SiteGround, riusati tra i contesti

// Scoperta: aggiunge alla lista fino a 8 link interni del menu della home (AUDIT_DISCOVER=1)
if (process.env.AUDIT_DISCOVER === '1') {
  try {
    const ctx = await browser.newContext({ httpCredentials: httpCredentials(), userAgent: UA_DESKTOP });
    const p = await ctx.newPage();
    await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 });
    await passSiteGroundChallenge(p);
    cookies = await ctx.cookies();
    const links = await p.evaluate((base) => [...new Set([...document.querySelectorAll('nav a, [class*="menu"] a, header a')]
      .map((a) => a.href).filter((h) => h.startsWith(base) && !h.includes('#') && !h.match(/\.(jpg|png|pdf)$/i)))], BASE);
    for (const l of links) if (!urls.includes(l) && urls.length < 14) urls.push(l);
    console.log(`Scoperte ${links.length} pagine dal menu; audit su ${urls.length} URL`);
    await ctx.close();
  } catch (e) { console.error(`Scoperta fallita: ${e.message}`); }
}

for (const url of urls) {
  const name = slug(url);
  console.log(`\n→ ${url}`);
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    httpCredentials: httpCredentials(),
    userAgent: UA_MOBILE,
  });
  if (cookies.length) await context.addCookies(cookies);
  const page = await context.newPage();

  // Raccolta risorse
  const responses = [];
  page.on('response', async (r) => {
    try {
      const h = r.headers();
      responses.push({
        url: r.url(),
        status: r.status(),
        type: r.request().resourceType(),
        contentType: h['content-type'] || '',
        size: Number(h['content-length'] || 0),
        encoding: h['content-encoding'] || '',
        cache: h['cache-control'] || '',
      });
    } catch {}
  });

  await page.coverage.startCSSCoverage({ resetOnNavigation: false });
  const t0 = Date.now();
  let status = 0;
  try {
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    status = resp?.status() ?? 0;
    if (await passSiteGroundChallenge(page)) {
      responses.length = 0; // scarto le risorse della pagina di challenge
      await page.reload({ waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
      status = 200;
      cookies = await context.cookies();
    }
  } catch (e) {
    console.error(`  errore di navigazione: ${e.message}`);
    results.push({ url, error: e.message });
    await context.close();
    continue;
  }
  const loadMs = Date.now() - t0;

  // Metriche di performance dal browser
  const metrics = await page.evaluate(async () => {
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = Object.fromEntries(performance.getEntriesByType('paint').map((p) => [p.name, Math.round(p.startTime)]));
    let lcp = null;
    let cls = 0;
    await new Promise((done) => {
      try {
        new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = Math.round(e.startTime); })
          .observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) cls += e.value; })
          .observe({ type: 'layout-shift', buffered: true });
      } catch {}
      setTimeout(done, 1500);
    });
    const docWidth = document.documentElement.scrollWidth;
    return {
      domContentLoaded: Math.round(nav?.domContentLoadedEventEnd ?? 0),
      load: Math.round(nav?.loadEventEnd ?? 0),
      fcp: paints['first-contentful-paint'] ?? null,
      lcp,
      cls: Number(cls.toFixed(3)),
      transferSizeKB: Math.round((nav?.transferSize ?? 0) / 1024),
      horizontalOverflow: docWidth > window.innerWidth ? docWidth - window.innerWidth : 0,
      stylesheetCount: document.styleSheets.length,
      scriptCount: document.scripts.length,
      imagesWithoutDimensions: [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).length,
      viewportMeta: document.querySelector('meta[name=viewport]')?.content ?? null,
      generator: document.querySelector('meta[name=generator]')?.content ?? null,
      bodyClass: document.body.className,
      themePaths: [...new Set([...document.querySelectorAll('link[href*="/wp-content/themes/"],script[src*="/wp-content/themes/"]')]
        .map((e) => (e.href || e.src).match(/wp-content\/themes\/([^/]+)/)?.[1]).filter(Boolean))],
      pluginPaths: [...new Set([...document.querySelectorAll('link[href*="/wp-content/plugins/"],script[src*="/wp-content/plugins/"]')]
        .map((e) => (e.href || e.src).match(/wp-content\/plugins\/([^/]+)/)?.[1]).filter(Boolean))],
      renderBlockingCss: [...document.querySelectorAll('link[rel=stylesheet]')]
        .filter((l) => !l.media || l.media === 'all' || l.media === 'screen').map((l) => l.href),
      headings: [...document.querySelectorAll('h1,h2,h3')].slice(0, 60).map((h) => `${h.tagName} ${h.textContent.trim().slice(0, 80)}`),
      navItems: [...document.querySelectorAll('nav a, [class*="menu"] a')].slice(0, 80).map((a) => a.textContent.trim()).filter(Boolean),
      tables: [...document.querySelectorAll('table')].map((t) => ({ class: t.className, rows: t.rows.length, cols: t.rows[0]?.cells.length ?? 0 })),
      buttonClasses: [...new Set([...document.querySelectorAll('a.button, a.btn, button, [class*="btn"], [class*="cta"]')].map((b) => b.className).filter(Boolean))].slice(0, 60),
    };
  });

  // CSS coverage: quanto di ogni foglio è davvero usato
  const coverage = await page.coverage.stopCSSCoverage();
  const cssCoverage = coverage.map((c) => {
    const total = c.text.length;
    const used = c.ranges.reduce((a, r) => a + (r.end - r.start), 0);
    return {
      url: c.url || '(inline)',
      totalKB: +(total / 1024).toFixed(1),
      usedPct: total ? +((used / total) * 100).toFixed(1) : 0,
      important: (c.text.match(/!important/g) || []).length,
      mediaQueries: (c.text.match(/@media/g) || []).length,
      isChildTheme: /themes\/[^/]*child/i.test(c.url) || /themes\/[^/]+-child/i.test(c.url),
    };
  });

  const html = await page.content();
  writeFileSync(resolve(htmlDir, `${name}.html`), html);

  // Screenshot a più larghezze (stesso contesto, viewport cambiato)
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: resolve(shots, `${name}-${w}.png`), fullPage: true });
  }

  const css = responses.filter((r) => r.type === 'stylesheet');
  const js = responses.filter((r) => r.type === 'script');
  const fonts = responses.filter((r) => r.type === 'font');
  const images = responses.filter((r) => r.type === 'image');
  const sumKB = (arr) => Math.round(arr.reduce((a, r) => a + r.size, 0) / 1024);

  const entry = {
    url, status, loadMs, metrics, cssCoverage,
    assets: {
      css: { count: css.length, kb: sumKB(css), files: css },
      js: { count: js.length, kb: sumKB(js), files: js },
      fonts: { count: fonts.length, kb: sumKB(fonts), files: fonts.map((f) => f.url) },
      images: { count: images.length, kb: sumKB(images) },
      requests: responses.length,
    },
  };
  results.push(entry);
  console.log(`  status ${status} · ${responses.length} richieste · CSS ${css.length} file / ${sumKB(css)} KB · JS ${js.length} file / ${sumKB(js)} KB · LCP ${metrics.lcp} ms · CLS ${metrics.cls} · overflow ${metrics.horizontalOverflow}px`);
  await context.close();
}

await browser.close();
writeJson(resolve(out, 'cookies.json'), cookies);

writeJson(resolve(out, 'results.json'), results);
writeJson(resolve(out, 'metrics.json'), results.map((r) => ({ url: r.url, status: r.status, loadMs: r.loadMs, ...r.metrics })));
writeJson(resolve(out, 'assets.json'), results.map((r) => ({ url: r.url, ...r.assets })));
writeJson(resolve(out, 'coverage.json'), results.map((r) => ({ url: r.url, css: r.cssCoverage })));

// Report leggibile
const lines = ['# Report audit front-end', '', `Base: ${BASE}`, `Data: ${new Date().toISOString()}`, ''];
for (const r of results) {
  lines.push(`## ${r.url}`, '');
  if (r.error) { lines.push(`Errore: ${r.error}`, ''); continue; }
  const m = r.metrics;
  lines.push('| Metrica | Valore |', '|---|---|',
    `| HTTP | ${r.status} |`, `| Richieste | ${r.assets.requests} |`,
    `| CSS | ${r.assets.css.count} file, ${r.assets.css.kb} KB |`,
    `| JS | ${r.assets.js.count} file, ${r.assets.js.kb} KB |`,
    `| Font | ${r.assets.fonts.count} file, ${r.assets.fonts.kb} KB |`,
    `| Immagini | ${r.assets.images.count} file, ${r.assets.images.kb} KB |`,
    `| FCP / LCP | ${m.fcp} / ${m.lcp} ms |`, `| CLS | ${m.cls} |`,
    `| Overflow orizzontale (390px) | ${m.horizontalOverflow} px |`,
    `| Immagini senza width/height | ${m.imagesWithoutDimensions} |`,
    `| Viewport meta | ${m.viewportMeta ?? 'ASSENTE'} |`,
    `| Generator | ${m.generator ?? '-'} |`,
    `| Temi rilevati | ${m.themePaths.join(', ') || '-'} |`,
    `| Plugin rilevati | ${m.pluginPaths.join(', ') || '-'} |`, '');
  lines.push('### CSS: utilizzo per foglio', '', '| Foglio | KB | usato % | !important | @media |', '|---|---|---|---|---|');
  for (const c of r.cssCoverage.sort((a, b) => b.totalKB - a.totalKB))
    lines.push(`| ${c.url.replace(BASE, '')} | ${c.totalKB} | ${c.usedPct} | ${c.important} | ${c.mediaQueries} |`);
  lines.push('', '### Tabelle', '', ...r.metrics.tables.map((t) => `- \`${t.class || '(senza classe)'}\` ${t.rows}×${t.cols}`), '');
  lines.push('### Heading', '', ...r.metrics.headings.map((h) => `- ${h}`), '');
}
writeFileSync(resolve(out, 'report.md'), lines.join('\n'));
console.log(`\nReport: ${resolve(out, 'report.md')}`);
