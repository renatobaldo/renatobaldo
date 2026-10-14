# Piano operativo – redesign sitiscommesse24.com

Obiettivo: trasformare un sito WordPress con struttura del 2013 in un prodotto responsive, mobile-first,
pulito e veloce, **intervenendo sul child theme** e mantenendo intatti contenuti, URL e SEO.

Principio guida: **non riscrivere il tema, sostituire il CSS**. Il markup generato dal tema padre resta;
il child theme carica un nuovo foglio di stile strutturato e, dove il markup non basta, piccoli override di
template (header, loop quote) nel child.

---

## Fase 0 – Setup (fatta in questa sessione)

- Repository, piano, tooling di audit, design system di base con anteprima statica.
- **Mancante**: accesso allo staging dall'ambiente di lavoro. Vedi "Cosa serve da te".

## Fase 1 – Analisi dello staging (1 sessione)

Output: `tools/audit/output/` + `docs/04-report-analisi.md` (da scrivere con i dati reali).

1. **Inventario tecnico** (audit wp-admin): versione WP/PHP, tema padre e versione, child theme, elenco
   plugin attivi, page builder eventuale, plugin di cache/minify già presenti, Site Health.
2. **Inventario CSS** (audit front-end): tutti i fogli di stile caricati, peso, ordine, quanti sono
   render-blocking, percentuale di CSS inutilizzato per pagina (Chrome coverage), regole `!important`
   accumulate nel child, media query esistenti.
3. **Inventario componenti**: markup reale di header, menu, tabelle quote/bookmaker, bottoni "Scommetti",
   box bonus, sidebar, footer. Serve per mappare le nuove classi sul markup esistente.
4. **Screenshot** a 360, 390, 768, 1024, 1440 px delle template chiave: home, pagina bookmaker/recensione,
   pagina quote/pronostici, pagina bonus, articolo blog, pagina statica.
5. **Baseline performance**: FCP, LCP, CLS, peso pagina, numero richieste, su mobile throttled.
   Confronto a fine progetto.
6. **Baseline SEO**: struttura heading, dati strutturati, canonical, hreflang se presente. Non devono
   cambiare con il restyling.

Decisioni che escono dalla fase 1:
- Il tema padre è ancora mantenuto o abbandonato dall'autore? Se abbandonato e con jQuery vecchio,
  valutare in futuro un tema "vuoto" (es. blank theme) con lo stesso child CSS. **Non ora**.
- Quanti template del padre vanno sovrascritti nel child (idealmente 2-3: header, footer, loop quote).

## Fase 2 – Layout responsive mobile-first (1-2 sessioni)

1. Nuovo `style.css` del child che carica i file in `assets/css/` tramite **cascade layers**
   (`tokens, base, layout, components, utilities, overrides`) così gli override vincono senza `!important`.
2. Reset del vecchio child CSS: si parte da zero, il vecchio file resta in `legacy/` per consultazione
   finché il nuovo non copre tutto.
3. Griglia fluida con `clamp()` e container query dove utile; nessuna larghezza fissa a 960/980 px.
4. Tipografia fluida, line-height leggibili, target touch minimo 44 px.
5. Breakpoint: 0 (base mobile), 640, 900, 1200. Si aggiunge solo se serve.

## Fase 3 – Restyling componenti (2 sessioni)

Ordine per impatto su mobile e conversione:

1. **Header + menu**: header compatto sticky, menu off-canvas su mobile con hamburger accessibile
   (`button` + `aria-expanded`), menu orizzontale da 900 px. Logo come SVG se disponibile.
2. **Tabelle quote / bookmaker**: su mobile la tabella diventa una lista di **card** (nome bookmaker, logo,
   bonus, rating, CTA) tramite `display:grid` e `data-label` sulle celle; da 900 px torna tabella.
   Nessuno scroll orizzontale sotto i 900 px.
3. **Bottoni di scommessa / CTA affiliati**: un solo componente `.btn` con varianti (primary, secondary,
   ghost), stati hover/focus/active visibili, altezza 48 px su mobile, larghezza piena nelle card.
4. **Box bonus, rating a stelle, badge "ADM", disclaimer 18+**: componenti riutilizzabili.
5. Footer: colonne che collassano, link legali, loghi ADM/18+/gioco responsabile ben visibili.

## Fase 4 – Performance CSS (1 sessione)

1. Un solo CSS del child, minificato, versionato con `filemtime()` per il cache busting.
2. Dequeue dei CSS del padre o dei plugin non più necessari (`wp_dequeue_style`) dopo verifica.
3. Critical CSS inline per header + above the fold; resto caricato con `media="print" onload`.
4. Font: massimo 2 famiglie, `font-display: swap`, preload del woff2 principale, niente Google Fonts
   remoti se si può self-hostare.
5. Immagini: `loading="lazy"`, dimensioni esplicite (anti CLS), WebP per i loghi bookmaker.
6. Verifica finale con Lighthouse mobile: target LCP < 2.5 s, CLS < 0.1, CSS totale < 60 KB.

## Fase 5 – Deploy e verifica (0,5 sessione)

1. Checklist cross-browser (iOS Safari, Chrome Android, Firefox, Edge) su staging.
2. Confronto screenshot prima/dopo e metriche prima/dopo.
3. Backup del child theme di produzione, deploy del nuovo child, svuotamento cache.
4. Monitoraggio 7 giorni: Search Console (CWV, errori mobile), conversioni affiliate.

---

## Consigli aggiuntivi (punto 5 della richiesta)

- **Sicurezza credenziali**: la password dello staging è stata condivisa in chat. A fine progetto va
  cambiata. Per l'audit automatico meglio un utente dedicato con ruolo *Editor* e una
  **Application Password** (Utenti → Profilo), revocabile.
- **Compliance iGaming Italia**: il restyling è l'occasione per rendere ben visibili su ogni template il
  badge 18+, il messaggio sul gioco responsabile e il riferimento ADM, e per uniformare i box bonus ai
  limiti sulla pubblicità (Decreto Dignità). Da verificare con chi segue la parte legale.
- **SEO**: nessun cambio di URL, heading o contenuti durante il restyling. Dati strutturati invariati.
  Un restyling CSS puro non impatta il ranking; un cambio di tema sì.
- **Non fare ora**: migrazione a page builder, cambio tema padre, riscrittura in headless. Aumentano
  rischio e costo senza beneficio immediato. Il child CSS nuovo resta valido anche in caso di futuro
  cambio tema.
- **Ambiente di lavoro**: per far lavorare l'agente direttamente sullo staging servono tre cose, sotto.

---

## Cosa serve da te

1. **Rete**: nelle impostazioni dell'ambiente cloud (menu ambiente nella barra del titolo → Edit →
   Network access) aggiungere ai domini consentiti
   `staging13.www10.sitiscommesse24.com` e `www10.sitiscommesse24.com`, lasciando attivi i package manager.
   Senza questo l'agente non può aprire né il sito né il wp-admin.
2. **Repository**: l'integrazione GitHub non può creare repository. Crea tu `sitiscommesse24-redesign`
   (privato) su GitHub, installa l'app Claude su quel repo e avvia una nuova sessione selezionandolo.
   Il contenuto di questa cartella si sposta lì con un `git subtree` o copiando la cartella.
3. **Accesso ai file del tema**: idealmente SFTP/SSH dello staging oppure l'export del child theme
   (zip da Aspetto → Temi, o via plugin tipo WP File Manager). Senza i file, l'analisi si limita a ciò
   che il front-end espone.
4. **Riferimenti visivi**: 2-3 siti concorrenti il cui stile ti piace, logo in SVG, colori del brand
   se esistono. In mancanza, si parte dai token proposti in `docs/03-design-system.md`.

## Stima

| Fase | Sessioni di lavoro |
|---|---|
| 1 Analisi | 1 |
| 2 Layout | 1-2 |
| 3 Componenti | 2 |
| 4 Performance | 1 |
| 5 Deploy | 0,5 |

Totale indicativo: 5-7 sessioni, condizionato dall'accesso allo staging e dalla complessità del tema padre.
