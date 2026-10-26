# Setup accessi: GitHub, rete Claude, SiteGround

Versione breve e ordinata: `docs/00-GUIDA-FACILE.md`. Questo file è il dettaglio di riferimento.

---

## Punto di partenza verificato (26/10/2026)

| Dato | Valore | Come l'ho verificato |
|---|---|---|
| Staging | `https://staging12.casinochap.com/` | indicato da Renato; risponde 200, certificato valido fino al 22/12/2026 |
| Produzione | `https://casinochap.com` | `www` fa 301 verso il dominio senza www |
| Hosting | SiteGround, account diverso da sitiscommesse24 | indicato da Renato; header `sg-captcha`, `host-header` lo confermano |
| Sito | WordPress 7.1.3, tema attivo `casinochap` (framework Redux) | codice HTML della home |

Poiché l'account è diverso, chiave SSH, hostname e username sono **nuovi**: non vanno riusati quelli di sitiscommesse24.

---

## A. Repository GitHub (5 minuti)

L'app GitHub usata dalle sessioni Claude non può creare repository. Lo crei tu, poi dai accesso all'app.

1. Vai su https://github.com/new
   - Repository name: `casinochap-redesign` (nome confermato da Renato)
   - Visibility: **Private**
   - Non spuntare "Add a README" (il contenuto arriva da questo kit)
   - Create repository
2. Installa l'app Claude sul nuovo repo: https://github.com/settings/installations → **Claude** →
   **Configure** → aggiungi `casinochap-redesign` ai repository selezionati → Save.
3. Apri https://claude.ai/code, nel selettore repository scegli `casinochap-redesign` e avvia una nuova
   sessione con questo messaggio:
   > Importa la cartella `casinochap-redesign/` dal branch `claude/wizardly-dijkstra-rmgmxc`
   > del repo `renatobaldo/renatobaldo` nella root di questo repository, poi leggi CLAUDE.md e procedi.

---

## B. Rete dell'ambiente Claude (3 minuti)

Senza questo passaggio l'agente non raggiunge né il sito né il wp-admin.

1. Su https://claude.ai/code apri il selettore ambiente (icona nuvola vicino alla casella del prompt).
2. **Add cloud environment** → nome `casinochap` (consigliato un ambiente separato da sitiscommesse24,
   così le variabili non si mischiano). Oppure modifica l'ambiente esistente.
3. **Network access** → **Custom**. In **Allowed domains**, una riga per dominio:
   ```
   staging12.casinochap.com
   casinochap.com
   www.casinochap.com
   *.siteground.com
   ```
   Spunta **Also include default list of common package managers**.
4. **Environment variables** (formato .env), solo valori non segreti:
   ```
   WP_BASE_URL=https://staging12.casinochap.com
   WP_USER=<utente wp-admin dedicato>
   ```
   La password **non** va qui. Passala in chat quando serve e cambiala a fine progetto, oppure usa
   **Network secrets** se il piano lo prevede.
5. Salva. Le sessioni nuove partono con la rete aggiornata.

Utente WordPress dedicato (consigliato): wp-admin → Utenti → Aggiungi nuovo, ruolo **Amministratore**
solo per la durata del progetto, con una password lunga e dedicata; a fine progetto si cambia o si elimina l'utente.


---

## C. SiteGround: chiave SSH per il deploy automatico (10 minuti)

Obiettivo: ogni push sul branch `staging` aggiorna il child theme sullo staging SiteGround. Il deploy lo
esegue GitHub Actions, quindi funziona anche se la sandbox Claude non può aprire SSH.

### C0. Lo staging esiste?

Site Tools → **WordPress** → **Staging**. Se casinochap non ha ancora una copia di staging: **Create**,
conferma che il dominio sia `staging12.casinochap.com`. Tutto il lavoro avviene lì.

### C1. Chiave SSH

Site Tools del sito casinochap → **Devs** → **SSH Keys Manager** → tab **Generate**:
nome `github-actions-deploy` + passphrase. Dal menu ⋮ → **SSH Credentials** (hostname, username, porta
18765) e ⋮ → **Private Key** (copia tutto, righe BEGIN/END comprese).

### C2. Percorsi del child theme

Li ricava il workflow `fetch-theme.yml` (sola lettura) una volta inseriti i secrets: stampa l'elenco dei
siti in `~/www/`, i temi di ciascuno e il tema attivo dello staging. Non serve aprire SSH a mano.

### C3. Secrets e variabili nel repository GitHub

Repo → **Settings** → **Secrets and variables** → **Actions**. Guida dettagliata in `docs/02-guida-secrets.md`.

Secrets:

| Nome | Valore |
|---|---|
| `SG_SSH_KEY` | chiave privata, completa di righe BEGIN/END |
| `SG_SSH_PASSPHRASE` | passphrase della chiave |
| `SG_HOST` | hostname da SSH Credentials |
| `SG_USER` | username da SSH Credentials |
| `WP_USER` | utente wp-admin dedicato (per l'audit wp-admin) |
| `WP_PASS` | password di login dell'utente (non una password applicazione) |

Variables:

| Nome | Valore |
|---|---|
| `SG_PORT` | `18765` |
| `STAGING_DOMAIN` | `staging12.casinochap.com` |
| `STAGING_URL` | `https://staging12.casinochap.com` |
| `PROD_URL` | `https://casinochap.com` |
| `STAGING_THEME_PATH` | percorso child theme staging (dopo C2, lo dico io) |
| `PROD_THEME_PATH` | percorso child theme produzione (dopo C2, lo dico io) |
| `THEME_SRC` | cartella locale del child da pubblicare, es. `theme/casinochap-child/` (dopo la fase 1) |

### C4. Protezione della produzione

Repo → **Settings** → **Environments** → **New environment** → `production` → **Required reviewers** →
aggiungi te stesso → Save. Il workflow di produzione si ferma e aspetta la tua approvazione.
Crea anche l'ambiente `staging` (senza reviewer): serve solo per mostrare l'URL nei run.

---

## D. Come fluiscono le modifiche

```
sessione Claude ──push──▶ branch staging ──Action──▶ staging SiteGround ──tu verifichi──▶
──▶ tu approvi su GitHub ──Action──▶ produzione SiteGround (solo cartella child theme)
```

1. Lavoro sul branch `staging`. Ogni push lancia `deploy-staging.yml`: rsync della sola cartella del child
   nel percorso `STAGING_THEME_PATH`, poi svuota la cache. Entro un minuto apri lo staging e vedi il risultato.
2. Le modifiche al database (contenuti, redirect, opzioni) passano da script in `scripts/`, lanciati con
   `server-check.yml` prima in versione "prova" e poi "apply", sempre sullo staging.
3. Quando sei soddisfatto, `deploy-production.yml` a mano (Actions → Run workflow) e approvazione. Prima del
   rsync fa un backup tar.gz del child attuale in `~/backups/` sul server. Gli script sul database vanno
   ripetuti in produzione nell'ordine del runbook.

Attenzione allo strumento **Full Deploy** di SiteGround Staging: sovrascrive file **e database** di produzione
con quelli dello staging. Non usarlo.

---

## E. Cosa posso fare io direttamente, cosa no

| Azione | Da una sessione | Note |
|---|---|---|
| Leggere sito e wp-admin dello staging | Sì, dopo il punto B | audit in sola lettura |
| Modificare il tema e pubblicarlo su staging | Sì, via push → Action | |
| Modificare contenuti/opzioni sullo staging | Sì, via script + `server-check.yml` | prova, poi apply |
| Pubblicare in produzione | Solo con la tua approvazione su GitHub | ambiente `production` protetto |
| Creare il repository GitHub | No | permesso non concedibile all'app |
| Riprendere la chat di sitiscommesse24 | No | ogni sessione parte dal repository: ciò che conta sta in CLAUDE.md e docs/ |
