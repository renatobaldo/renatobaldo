# Setup accessi: GitHub, rete Claude, SiteGround

Tre blocchi indipendenti, circa 20 minuti in tutto. È la stessa procedura usata per sitiscommesse24:
se quella chiave SSH e quell'ambiente Claude sono ancora attivi, i blocchi B e C si riducono a un'aggiunta
di domini e di secrets (vedi le note "Se riusi…").

---

## Punto di partenza verificato (26/10/2026)

| Dato | Valore | Come l'ho verificato |
|---|---|---|
| Staging | `https://staging2.casinochap.com/` | indicato da Renato; DNS risolve a `35.214.176.77` |
| Produzione | `casinochap.com` | DNS risolve a più IP, certificato valido fino al 22/12/2026 |
| Certificato staging | **scaduto il 13/09/2025** | ispezione del certificato (Let's Encrypt, wildcard `*.staging2.casinochap.com`) |
| Hosting | indizi SiteGround: header `sg-captcha`, `host-header`, `x-proxy-cache-info` | header HTTP; Renato ha scritto "altro hosting", quindi **da confermare** |
| Accesso dalla sandbox | la home risponde HTTP 202 con challenge anti-bot | `curl` in chiaro |

### Staging: certificato scaduto (da sistemare prima di tutto)

Un certificato scaduto da oltre un anno fa mostrare l'avviso di sicurezza a chiunque apra lo staging e
blocca curl, Playwright e Lighthouse. Soluzione corretta (2 minuti): Site Tools del sito → **Security** →
**SSL Manager** → rinnova/reinstalla Let's Encrypt per `staging2.casinochap.com` (se il pannello è diverso,
vale lo stesso principio sul pannello dell'hosting).

Soluzione provvisoria, solo per gli audit: variabile GitHub `AUDIT_INSECURE_TLS` = `1`. Non riguarda il deploy,
che usa SSH e non HTTPS. Si toglie appena il certificato è rinnovato.

### Se l'hosting è SiteGround ma un account diverso da sitiscommesse24

Chiave SSH, hostname e username sono **per account**: non vanno riusati quelli di sitiscommesse24. Si genera
una nuova chiave dal Site Tools del sito casinochap (blocco C1) e si inseriscono i secrets nel nuovo repository.

### Se l'hosting NON è SiteGround

Servono: accesso SSH con rsync (o SFTP), WP-CLI sul server, percorso della cartella `wp-content/themes/`.
`deploy.sh` funziona con qualunque host SSH+rsync cambiando `SG_PORT` e il comando di cache; lo svuotamento cache
(`wp sg purge`) è specifico SiteGround e verrebbe sostituito da quello del plugin di cache in uso.

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
   staging2.casinochap.com
   casinochap.com
   www.casinochap.com
   *.siteground.com
   ```
   Spunta **Also include default list of common package managers**.
4. **Environment variables** (formato .env), solo valori non segreti:
   ```
   WP_BASE_URL=https://staging2.casinochap.com
   WP_USER=<utente wp-admin dedicato>
   ```
   La password **non** va qui. Passala in chat quando serve e cambiala a fine progetto, oppure usa
   **Network secrets** se il piano lo prevede.
5. Salva. Le sessioni nuove partono con la rete aggiornata.

Utente WordPress dedicato (consigliato): wp-admin → Utenti → Aggiungi nuovo, ruolo **Amministratore**
solo per la durata del progetto, poi Profilo → **Password applicazione** → crea "claude-audit".

Se riusi l'ambiente di sitiscommesse24: aggiungi solo i domini di casinochap e cambia `WP_BASE_URL`.

---

## C. SiteGround: chiave SSH per il deploy automatico (10 minuti)

Obiettivo: ogni push sul branch `staging` aggiorna il child theme sullo staging SiteGround. Il deploy lo
esegue GitHub Actions, quindi funziona anche se la sandbox Claude non può aprire SSH.

### C0. Lo staging esiste?

Site Tools → **WordPress** → **Staging**. Se casinochap non ha ancora una copia di staging: **Create**,
conferma che il dominio sia `staging2.casinochap.com`. Tutto il lavoro avviene lì.

### C1. Chiave SSH

Se si scopre che casinochap è **nello stesso account SiteGround** di sitiscommesse24: la chiave `github-actions-deploy`
già creata vale per tutti i siti dell'account; salta a C2 e riusa gli stessi valori di `SG_SSH_KEY`,
`SG_SSH_PASSPHRASE`, `SG_HOST`, `SG_USER` (controlla in SSH Keys Manager → SSH Credentials che hostname e
username siano gli stessi anche per questo sito).

Altrimenti: Site Tools del sito casinochap → **Devs** → **SSH Keys Manager** → tab **Generate**:
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
| `WP_PASS` | password applicazione dell'utente |

Variables:

| Nome | Valore |
|---|---|
| `SG_PORT` | `18765` |
| `STAGING_DOMAIN` | `staging2.casinochap.com` |
| `STAGING_URL` | `https://staging2.casinochap.com` |
| `PROD_URL` | `https://casinochap.com` (o `https://www.casinochap.com`, quello canonico: da verificare) |
| `AUDIT_INSECURE_TLS` | `1` solo finché il certificato dello staging non è rinnovato |
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
