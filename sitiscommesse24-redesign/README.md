# sitiscommesse24 – redesign mobile-first del child theme WordPress

Progetto di modernizzazione dell'interfaccia di **sitiscommesse24.com** (struttura del 2013) verso un layout
responsive, pulito e veloce, lavorando **solo sul child theme** e senza toccare il tema padre.

Stato: **fase 0 – setup**. L'analisi dello staging non è ancora stata eseguita (vedi `docs/02-audit-staging.md`).

## Struttura

| Percorso | Contenuto |
|---|---|
| `docs/01-piano-operativo.md` | Piano in 5 fasi, decisioni da prendere, rischi, regole di lavoro staging → produzione |
| `docs/02-audit-staging.md` | Cosa estrae l'audit, come lanciarlo, cosa guardare nei risultati |
| `docs/03-design-system.md` | Token (colori, spazi, tipografia), breakpoint, specifiche dei componenti |
| `tools/audit/` | Script Playwright: audit front-end (CSS, performance, screenshot) e audit wp-admin (tema, plugin, Site Health) |
| `theme/sitiscommesse24-child-v2/` | Nuovo CSS del child theme (cascade layers, mobile-first) + pagina di anteprima dei componenti |

## Avvio rapido

```bash
cp .env.example .env            # inserisci le credenziali dello staging
cd tools/audit && npm install
npm run audit:frontend          # output in tools/audit/output/frontend/ (AUDIT_URLS=file.txt per una lista alternativa)
npm run audit:wpadmin           # output in tools/audit/output/wpadmin/
```

Anteprima dei componenti senza WordPress: apri `theme/sitiscommesse24-child-v2/preview/index.html` nel browser.

## Regole

- Nessuna modifica diretta in produzione: tutto passa da staging, poi deploy del solo child theme.
- Nessuna credenziale nel repository: usare `.env`.
- Il tema padre non si modifica: ogni override vive nel child theme.
