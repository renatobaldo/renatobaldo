# Design system – proposta iniziale

Da validare con i colori del brand reali. Tutto è espresso come custom property in
`theme/sitiscommesse24-child-v2/assets/css/00-tokens.css`: cambiare i token cambia tutto il sito.

## Principi

- **Mobile-first**: il CSS base è per 360 px; le media query aggiungono, non tolgono.
- **Un solo modo di fare ogni cosa**: un componente bottone, un componente card, una tabella.
- **Specificità bassa**: classi BEM, cascade layers, zero `!important` nel CSS nuovo.
- **Leggibilità e fiducia**: il sito vende affidabilità (bookmaker ADM); colori sobri, contrasto AA,
  badge di conformità sempre visibili.

## Token

| Gruppo | Valori |
|---|---|
| Colore brand | `--c-primary: #0b5fff` (azione, link), `--c-primary-700` hover, `--c-accent: #16a34a` (CTA "Scommetti", quota in rialzo), `--c-warn: #dc2626` (quota in ribasso, errori) |
| Neutri | `--c-bg`, `--c-surface`, `--c-border`, `--c-text`, `--c-text-muted` in scala grigio-blu |
| Tipografia | font di sistema (`system-ui`) di default: zero richieste di rete. Scala fluida `clamp()` da 14 a 18 px per il body, h1 24→40 px |
| Spazi | scala 4 px: `--s-1`=4, `--s-2`=8, `--s-3`=12, `--s-4`=16, `--s-6`=24, `--s-8`=32, `--s-12`=48 |
| Raggi | `--r-sm` 6, `--r-md` 10, `--r-lg` 14, `--r-pill` 999 |
| Ombre | due livelli, leggere |
| Breakpoint | `--bp-sm` 640, `--bp-md` 900, `--bp-lg` 1200 (le media query non accettano variabili: valori ripetuti nei file) |

## Componenti

### Header (`.site-header`)
- Mobile: barra 56 px sticky, logo a sinistra, hamburger a destra, CTA "Bonus" opzionale.
- Desktop (≥ 900): logo + menu orizzontale + CTA.
- `position: sticky` con ombra al scroll; nessun layout shift (altezza fissa).

### Navigazione (`.nav`)
- Mobile: pannello off-canvas da destra, overlay, chiusura con ESC e tap fuori; `aria-expanded` sul bottone.
- Sottomenu: accordion su mobile, dropdown su desktop.
- Focus visibile su tutti i link.

### Tabella quote / bookmaker (`.odds-table`)
- Desktop: tabella classica con header sticky, righe alternate, colonna CTA a destra.
- Mobile (< 900): ogni `tr` diventa una card a griglia; ogni `td` mostra la propria etichetta da `data-label`.
- Quote: `font-variant-numeric: tabular-nums`, colore verde/rosso per variazione, `.is-best` per quota migliore.

### Bottone scommessa (`.btn`)
- Varianti: `.btn--primary` (brand), `.btn--bet` (verde, CTA affiliato), `.btn--ghost`, `.btn--sm`.
- Altezza 48 px mobile / 44 px desktop, raggio `--r-md`, stato focus con anello 3 px.
- `.btn--block` in card e tabelle mobile.

### Card bookmaker (`.bk-card`)
- Logo (dimensioni esplicite), nome, rating stelle, bonus in evidenza, 3 punti chiave, CTA.
- Badge `.badge--adm` e `.badge--18`.

### Utility
- `.container`, `.stack` (gap verticale), `.cluster` (gap orizzontale con wrap), `.visually-hidden`,
  `.hide-mobile`, `.hide-desktop`.
