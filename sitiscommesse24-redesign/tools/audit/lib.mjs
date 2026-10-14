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
