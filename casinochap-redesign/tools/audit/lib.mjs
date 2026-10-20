import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/** Carica .env dalla root del progetto (due livelli sopra) senza dipendenze. */
export function loadEnv() {
  const envPath = resolve(here, '..', '..', '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

export function requireEnv(names) {
  const missing = names.filter((n) => !process.env[n]);
  if (missing.length) {
    console.error(`Variabili mancanti in .env: ${missing.join(', ')}`);
    process.exit(1);
  }
}

export function outDir(sub) {
  const d = resolve(here, 'output', sub);
  mkdirSync(d, { recursive: true });
  return d;
}

export function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2));
}

export function slug(url) {
  const p = new URL(url).pathname.replace(/\/+$/, '') || 'home';
  return p.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'home';
}

export function httpCredentials() {
  const u = process.env.HTTP_AUTH_USER, p = process.env.HTTP_AUTH_PASS;
  return u && p ? { username: u, password: p } : undefined;
}

export function readUrls(file) {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

/**
 * SiteGround "Robot Challenge Screen": una pagina JS (HTTP 202) che risolve una prova e reindirizza.
 * Attende il reindirizzamento (fino a 45 s) e restituisce true se è stato superato.
 */
export async function passSiteGroundChallenge(page) {
  const isChallenge = async () => {
    try { return /Robot Challenge Screen/i.test(await page.title()) || page.url().includes('/.well-known/'); } catch { return false; }
  };
  if (!(await isChallenge())) return false;
  console.log('  challenge anti-bot SiteGround: attendo il reindirizzamento…');
  try {
    await page.waitForFunction(() => !/Robot Challenge Screen/i.test(document.title) && !location.pathname.startsWith('/.well-known/'), null, { timeout: 45000 });
    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
  } catch {
    console.error('  challenge non superato entro 45 s (possibile captcha reale)');
    return false;
  }
  console.log(`  challenge superato → ${page.url()}`);
  return true;
}

/** User agent realistici: alcuni controlli anti-bot bloccano "HeadlessChrome". */
export const UA_DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
export const UA_MOBILE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
