/**
 * Lighthouse mobile con rete 4G simulata (preset ufficiale "mobile", throttling simulato).
 * Usa i cookie della challenge SiteGround salvati da audit-frontend (output/frontend/cookies.json).
 * Richiede: npx lighthouse (installato dal workflow) e Chrome/Chromium sul sistema.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, requireEnv, slug, UA_MOBILE } from './lib.mjs';

loadEnv();
requireEnv(['WP_BASE_URL']);
const BASE = process.env.WP_BASE_URL.replace(/\/+$/, '');
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, 'output', 'lighthouse'); mkdirSync(out, { recursive: true });
const paths = (process.env.LH_PATHS || '/,/bookmakers-stranieri/,/sportsbook/22bet/,/news/come-scommettere-sulla-ufc/').split(',');
const cookiesFile = resolve(here, 'output', 'frontend', 'cookies.json');
const cookies = existsSync(cookiesFile) ? JSON.parse(readFileSync(cookiesFile, 'utf8')) : [];
const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ');
const chrome = process.env.CHROME_PATH || '';

const rows = [];
for (const p of paths) {
  const url = BASE + p; const name = slug(url);
  const json = resolve(out, `${name}.json`);
  const args = [url, '--output=json', `--output-path=${json}`, '--preset=perf', '--form-factor=mobile',
    '--screenEmulation.mobile', '--throttling-method=simulate', '--quiet',
    '--chrome-flags=--headless=new --no-sandbox --disable-gpu'];
  args.push(`--extra-headers=${JSON.stringify(cookieHeader ? { Cookie: cookieHeader, 'User-Agent': UA_MOBILE } : { 'User-Agent': UA_MOBILE })}`);
  args.push(`--emulatedUserAgent=${UA_MOBILE}`);
  console.log(`→ lighthouse ${url}`);
  try {
    execFileSync('npx', ['--yes', 'lighthouse', ...args], { stdio: 'inherit', env: { ...process.env, CHROME_PATH: chrome || undefined } });
    const r = JSON.parse(readFileSync(json, 'utf8'));
    const a = r.audits;
    const row = {
      path: p,
      performance: Math.round((r.categories.performance?.score ?? 0) * 100),
      fcp: a['first-contentful-paint']?.displayValue, lcp: a['largest-contentful-paint']?.displayValue,
      tbt: a['total-blocking-time']?.displayValue, cls: a['cumulative-layout-shift']?.displayValue,
      speedIndex: a['speed-index']?.displayValue,
      totalKB: Math.round((a['total-byte-weight']?.numericValue ?? 0) / 1024),
      unusedCssKB: Math.round((a['unused-css-rules']?.details?.overallSavingsBytes ?? 0) / 1024),
      renderBlocking: a['render-blocking-resources']?.details?.items?.length ?? 0,
      finalUrl: r.finalDisplayedUrl,
    };
    rows.push(row); console.log(row);
  } catch (e) { console.error(`  lighthouse fallito su ${url}: ${e.message}`); rows.push({ path: p, error: e.message }); }
}
const md = ['# Lighthouse mobile (4G simulato)', '', `Base: ${BASE}`, '', '| Pagina | Perf | FCP | LCP | TBT | CLS | Speed Index | Peso KB | CSS inutile KB | Render-blocking |', '|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => r.error ? `| ${r.path} | errore | | | | | | | | |` : `| ${r.path} | ${r.performance} | ${r.fcp} | ${r.lcp} | ${r.tbt} | ${r.cls} | ${r.speedIndex} | ${r.totalKB} | ${r.unusedCssKB} | ${r.renderBlocking} |`)];
writeFileSync(resolve(out, 'summary.md'), md.join('\n'));
writeFileSync(resolve(out, 'summary.json'), JSON.stringify(rows, null, 2));
console.log(md.join('\n'));
