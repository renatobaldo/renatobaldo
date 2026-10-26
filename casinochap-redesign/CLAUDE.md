# Istruzioni per Claude – casinochap-redesign

Lingua: italiano. Utente: Renato Baldo. Progetto: riordino e restyling mobile-first del child theme
WordPress di casinochap.com (hosting SiteGround), senza toccare il tema padre.

## Prima di tutto
1. Leggi `README.md` (fasi e stato) e `docs/01-setup-accessi.md` (accessi e deploy).
2. Verifica la rete: `curl -sS -o /dev/null -w "%{http_code}" "$WP_BASE_URL/"`.
   Se risponde 000, la policy di rete dell'ambiente non è attiva: fermati e dillo.

## Regole fisse
- Nessuna credenziale nel repository. Le credenziali wp-admin arrivano in chat o da `.env` (ignorato da git).
- Nessuna modifica in produzione. Il deploy in produzione è solo manuale con approvazione (workflow `deploy-production.yml`).
- Tema padre intoccabile: ogni override vive nel child theme (`theme/<nome-child>/`).
- Gli audit in `tools/audit/` sono in sola lettura: non salvare nulla da wp-admin.
- Script `scripts/server-*.sh`: quelli che modificano il database esistono in due versioni (prova / `-apply`),
  sono idempotenti e fanno backup nei meta `_cc_*_backup`. Da ripetere in produzione dopo il deploy.
- Non dichiarare "fatto" senza verifica (screenshot, output dello script, HTTP 200).
- Una domanda alla volta a Renato; nessun passaggio in produzione finché non lo chiede lui.
- Questo progetto è separato da sitiscommesse24: non riportare qui decisioni, colori o contenuti di quel sito
  senza richiesta esplicita.

## Ciclo di lavoro
modifica → test locale (tools/audit, Playwright con Chromium in `/opt/pw-browsers`) → push su `staging`
(deploy automatico) → `server-check.yml` o `audit-staging.yml` → lettura dei risultati (branch `audit-results`).

## Stato
- Fase 0 (setup): kit creato, accessi da completare (vedi `docs/01-setup-accessi.md`).
- Staging: `https://staging12.casinochap.com/` (creato da Renato il 26/10/2026; sostituisce staging2, che aveva il certificato scaduto).
  Variabile `STAGING_DOMAIN=staging12.casinochap.com`. Produzione: `https://casinochap.com` (www fa 301 verso non-www).
- Hosting: SiteGround, account diverso da sitiscommesse24 (confermato da Renato): chiave SSH, host e utente propri.
- Rilevato il 26/10/2026 dalla sandbox (sola lettura): staging12 risponde 200 in HTTPS con certificato valido (wildcard fino al 22/12/2026),
  WordPress 7.1.3, tema attivo `casinochap`, framework Redux, plugin visibili in home: geotargetingwp, cookie-law-info.
  Non è ancora noto se `casinochap` sia un child theme o un tema autonomo: lo dirà `fetch-theme.yml`. Se è autonomo,
  la regola "solo child theme" va riletta con Renato prima di toccare qualunque file.
- La home in HTTP chiaro risponde con la challenge anti-bot SiteGround (HTTP 202); in HTTPS la sandbox passa. Per le verifiche
  affidabili usare comunque `server-check.yml`.
- `AUDIT_INSECURE_TLS` esiste ma non serve più con staging12 (lasciare spenta).
- Dati ancora da raccogliere: nome del tema padre e del child, percorsi sul server,
  elenco plugin, post type delle recensioni casinò. Si ottengono con `fetch-theme.yml` e l'audit.
