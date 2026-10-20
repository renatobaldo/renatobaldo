/** Screenshot della home a 390 px su Firefox e WebKit (verifica compatibilità CSS). */
import { firefox, webkit } from 'playwright';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnv, requireEnv, passSiteGroundChallenge, UA_MOBILE } from './lib.mjs';
loadEnv(); requireEnv(['WP_BASE_URL']);
const BASE = process.env.WP_BASE_URL.replace(/\/+$/, '');
const out = resolve(dirname(fileURLToPath(import.meta.url)), 'output', 'browsers'); mkdirSync(out, { recursive: true });
for (const [name, type] of [['firefox', firefox], ['webkit', webkit]]) {
  try {
    const b = await type.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 }, userAgent: UA_MOBILE });
    await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 60000 }); await passSiteGroundChallenge(p);
    await p.reload({ waitUntil: 'networkidle' }).catch(() => {});
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    await p.screenshot({ path: resolve(out, `home-390-${name}.png`), fullPage: false });
    await p.click('.nav-toggle, .menu-toggle, button[aria-controls]').catch(() => {}); await p.waitForTimeout(400);
    await p.screenshot({ path: resolve(out, `home-390-${name}-menu.png`) });
    console.log(`${name}: ok, overflow ${ov}px`); await b.close();
  } catch (e) { console.error(`${name}: ${e.message}`); }
}
