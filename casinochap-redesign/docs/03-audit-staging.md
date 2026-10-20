# Audit dello staging

Due script Playwright, entrambi in sola lettura. Non modificano nulla su WordPress.
Si lanciano dalla sandbox (se la rete lo permette) o con il workflow `audit-staging.yml`, che pubblica
i risultati sul branch `audit-results` (`git fetch origin audit-results`).

## Prerequisiti

```bash
cp .env.example .env    # compila WP_BASE_URL, WP_USER, WP_PASS
cd tools/audit
npm install
```

## Audit front-end – `npm run audit:frontend`

Legge gli URL da `urls.txt` (percorsi relativi a `WP_BASE_URL`; con `AUDIT_DISCOVER=1` aggiunge le voci
del menu della home) e per ciascuno salva in `output/frontend/`:

- screenshot full-page a 360, 390, 768, 1024, 1440 px
- fogli di stile e script con peso, ordine di caricamento, render-blocking (`assets.json`)
- percentuale di CSS inutilizzato per foglio (`coverage.json`)
- FCP, LCP, CLS, DOMContentLoaded, load, peso totale, numero richieste (`metrics.json`)
- HTML grezzo (`html/`), conteggio `!important` e media query del child (`css-stats.json`)
- report riassuntivo (`report.md`)

## Audit wp-admin – `npm run audit:wpadmin`

Login con le credenziali in `.env` e salvataggio di: Salute del sito → Info, temi, plugin, file del child
(se l'editor del tema è abilitato), impostazioni Lettura e Permalink, screenshot di ogni pagina.

## Lighthouse e altri browser

`node lighthouse.mjs` (mobile, 4G simulato) e `node browsers.mjs` (screenshot Firefox e WebKit).
Chromium locale: `/opt/pw-browsers`.

## Cosa guardare nei risultati

1. Quanti CSS si caricano e quanto pesano: oltre 150 KB o più di 8 file è un problema certo.
2. CSS inutilizzato sopra il 70%: il child nuovo riparte da zero, non pulisce il vecchio.
3. `!important` nel child: ogni occorrenza è una battaglia di specificità col padre.
4. Screenshot a 360/390 px: dove compare lo scroll orizzontale ci sono tabelle da trasformare in card.
5. CLS alto: quasi sempre loghi senza `width/height` o font che cambiano a caricamento.
6. Plugin: doppioni (due cache, due SEO, slider inutilizzati) da disattivare.
7. Post type e tassonomie delle recensioni casinò: definiscono la struttura dati su cui costruire le card.
