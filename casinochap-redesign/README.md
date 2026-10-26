# casinochap – riordino e redesign del child theme WordPress

Progetto di messa in ordine di **casinochap.com** con lo stesso metodo usato per sitiscommesse24.com:
lavoro **solo sul child theme**, tema padre intoccabile, tutto passa dallo staging, produzione solo con
approvazione manuale su GitHub.

Stato: **fase 0 – setup**. Staging: https://staging2.casinochap.com/. Lo staging non è ancora stato analizzato:
prima servono gli accessi (vedi `docs/01-setup-accessi.md`).

## Struttura

| Percorso | Contenuto |
|---|---|
| `docs/01-setup-accessi.md` | Guida passo-passo: repository GitHub, rete Claude, chiave SSH SiteGround, deploy automatico |
| `docs/02-guida-secrets.md` | Dove e come inserire secrets e variabili su GitHub |
| `docs/03-audit-staging.md` | Cosa estrae l'audit, come lanciarlo, cosa guardare nei risultati |
| `.github/workflows/` | Deploy su staging (ogni push su `staging`), deploy produzione (approvazione manuale), download temi, audit, comandi sul server |
| `scripts/deploy.sh` | rsync del child theme via SSH + svuotamento cache |
| `scripts/server-*.sh` | Script eseguiti sul server SiteGround via `server-check.yml` (inventario e verifiche, sola lettura) |
| `tools/audit/` | Script Playwright: audit front-end (CSS, performance, screenshot) e audit wp-admin (tema, plugin, Site Health) |
| `theme/` | Il nuovo child theme (nasce dopo il download di quello attuale in `legacy/`) |
| `legacy/` | Copia di riferimento di tema padre e child scaricati dallo staging (creata dal workflow, non si modifica) |

## Avvio rapido

```bash
cp .env.example .env            # inserisci le credenziali dello staging
cd tools/audit && npm install
npm run audit:frontend          # output in tools/audit/output/frontend/
npm run audit:wpadmin           # output in tools/audit/output/wpadmin/
```

## Regole

- Nessuna modifica diretta in produzione: tutto passa da staging, poi deploy del solo child theme.
- Nessuna credenziale nel repository: usare `.env` e i secrets di GitHub.
- Il tema padre non si modifica: ogni override vive nel child theme.
- Niente "fatto" senza verifica (screenshot, output dello script, HTTP 200).

## Fasi previste

0. Setup accessi e repository (questo documento).
1. Analisi dello staging: inventario tecnico (WP, PHP, tema, plugin), CSS, componenti, screenshot,
   baseline performance e SEO. Output: `docs/04-report-analisi.md`.
2. Piano di riordino concordato con Renato (cosa tenere, cosa togliere, priorità).
3. Child theme nuovo: layout mobile-first, componenti (header, card casinò, CTA, recensioni, footer).
4. Pulizia contenuti e plugin, redirect, SEO.
5. Runbook di produzione e pubblicazione con approvazione.
