# Audit dello staging

Due script Playwright, entrambi in sola lettura. Non modificano nulla su WordPress.

## Prerequisiti

```bash
cp .env.example .env    # compila WP_BASE_URL, WP_USER, WP_PASS
cd tools/audit
npm install
```

Playwright scarica Chromium al primo `npm install`. Se Chromium è già presente nel sistema
(`PLAYWRIGHT_BROWSERS_PATH`), non lo riscarica.

## Audit front-end – `npm run audit:frontend`

Legge gli URL da `urls.txt` (uno per riga, percorsi relativi a `WP_BASE_URL`) e per ciascuno:

- screenshot full-page a 360, 390, 768, 1024, 1440 px → `output/frontend/screenshots/`
- elenco fogli di stile e script con peso, ordine di caricamento, render-blocking → `assets.json`
- percentuale di CSS inutilizzato per foglio (Chrome CSS coverage) → `coverage.json`
- metriche: FCP, LCP, CLS, DOMContentLoaded, load, peso totale, numero richieste → `metrics.json`
- HTML grezzo della pagina → `html/` (serve per mappare le classi del tema)
- contatore di regole `!important` e di media query nei CSS del child → `css-stats.json`
- report riassuntivo leggibile → `report.md`

## Audit wp-admin – `npm run audit:wpadmin`

Esegue il login con le credenziali in `.env` e salva:

- Strumenti → Salute del sito → Info: versioni WP/PHP/server, tema attivo, tema padre, plugin attivi e
  inattivi, impostazioni upload → `site-health.txt`
- Aspetto → Temi: tema attivo, versione, autore, parent → `themes.json`
- Plugin: elenco con stato e versione → `plugins.json`
- Aspetto → Editor del tema (se abilitato): contenuto di `style.css` e `functions.php` del child e
  lista dei file del child → `child-theme/`
- Impostazioni → Lettura e Permalink: pagina iniziale, struttura permalink → `settings.json`
- screenshot di ogni pagina visitata → `screenshots/`

Se l'editor del tema è disabilitato (`DISALLOW_FILE_EDIT`), i file del child vanno esportati a mano.

## Cosa guardare nei risultati

1. Quanti CSS si caricano e quanto pesano in totale: oltre 150 KB o più di 8 file è un problema certo.
2. CSS inutilizzato sopra il 70%: il child nuovo deve ripartire da zero, non pulire il vecchio.
3. `!important` nel child: ogni occorrenza è una battaglia di specificità col padre da eliminare con i layer.
4. Screenshot a 360/390 px: dove compare lo scroll orizzontale, lì sono le tabelle quote da trasformare in card.
5. CLS alto: quasi sempre loghi bookmaker senza `width/height` o font che cambiano a caricamento.
6. Plugin: cercare doppioni (due plugin di cache, due di SEO, slider inutilizzati) da disattivare.
