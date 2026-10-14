# Setup accessi: SiteGround, GitHub, rete Claude

Tre blocchi indipendenti. Fatti in quest'ordine servono circa 20 minuti.
Fonti: documentazione SiteGround (Site Tools) e Claude Code, elencate in fondo.

---

## A. Repository GitHub (5 minuti)

L'app GitHub usata dalle sessioni Claude non ha il permesso di creare repository: non è un permesso
che si può concedere per singolo repo. Lo crei tu, poi dai accesso all'app.

1. Vai su https://github.com/new
   - Repository name: `sitiscommesse24-redesign`
   - Visibility: **Private**
   - Non spuntare "Add a README" (il contenuto arriva da questo progetto)
   - Create repository
2. Installa l'app Claude sul nuovo repo: https://github.com/apps/claude/installations/new
   - Scegli il tuo account, poi **Only select repositories** → seleziona `sitiscommesse24-redesign`.
   - Se l'app è già installata, vai su https://github.com/settings/installations → Claude → Configure
     e aggiungi il repo all'elenco.
3. Apri https://claude.ai/code, nel selettore repository scegli `sitiscommesse24-redesign` e avvia
   una nuova sessione con questo messaggio:
   > Importa la cartella `sitiscommesse24-redesign/` dal branch `claude/adoring-wozniak-crx11b`
   > del repo `renatobaldo/renatobaldo` nella root di questo repository e procedi con la fase 1.

Alternativa se preferisci non farlo a mano: dal tuo terminale, con Claude Code CLI e `gh` autenticato,
`/web-setup` collega il tuo token `gh` alle sessioni cloud. Con quel token la creazione di repository
può funzionare, ma sostituisce la connessione tramite app. Sconsigliato: i tre passi sopra sono più rapidi.

---

## B. Rete dell'ambiente Claude (3 minuti)

Senza questo passaggio l'agente non raggiunge né il sito né il wp-admin.

1. Su https://claude.ai/code apri il selettore ambiente (icona nuvola vicino alla casella del prompt).
2. Seleziona **Cloud**, passa sopra l'ambiente **Default** e clicca l'icona impostazioni (oppure
   **Add cloud environment** per crearne uno dedicato, es. "sitiscommesse24").
3. **Network access** → **Custom**. In **Allowed domains**, una riga per dominio:
   ```
   staging13.www10.sitiscommesse24.com
   www10.sitiscommesse24.com
   *.siteground.com
   ```
   Spunta **Also include default list of common package managers**.
4. **Environment variables** (formato .env), solo valori non segreti:
   ```
   WP_BASE_URL=https://staging13.www10.sitiscommesse24.com
   WP_USER=<utente dedicato, vedi sotto>
   ```
   La password **non** va qui: chiunque usi l'ambiente la leggerebbe. Su piano Pro/Max usa
   **Network secrets**; altrimenti passala in chat quando serve e cambiala a fine progetto.
5. Salva. Le sessioni nuove partono con la rete aggiornata.

Utente WordPress dedicato (consigliato): in wp-admin → Utenti → Aggiungi nuovo, ruolo
**Amministratore** solo per la durata del progetto (serve per leggere temi e plugin), poi
Profilo → **Password applicazione** → crea "claude-audit". Si revoca con un clic.

---

## C. SiteGround: chiave SSH per il deploy automatico (10 minuti)

Obiettivo: ogni push sul branch `staging` del repository aggiorna il child theme sullo staging
SiteGround, così vedi le modifiche sul sito reale senza passaggi manuali. Il deploy lo esegue
GitHub Actions dai server GitHub, quindi funziona anche se la sandbox Claude non può aprire SSH.

### C1. Crea la chiave

1. Site Tools → **Devs** → **SSH Keys Manager**.
2. Tab **Generate**: nome `github-actions-deploy`, passphrase **vuota** (GitHub Actions non può
   digitarla). Se SiteGround obbliga una passphrase, genera la chiave sul tuo computer:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/sg_deploy -N ""
   ```
   e incolla il contenuto di `~/.ssh/sg_deploy.pub` nel tab **Import**.
3. Dal menu ⋮ della chiave → **SSH Credentials**: annota **hostname**, **username**, porta **18765**.
4. Dal menu ⋮ → **Private Key**: copia tutto il testo (serve al passo C3).

### C2. Trova i percorsi del child theme

Via SSH dal tuo computer (o chiedi al supporto SiteGround):
```bash
ssh -p 18765 -i ~/.ssh/sg_deploy USERNAME@HOSTNAME
ls www/                        # elenca i siti: produzione e staging hanno cartelle separate
ls www/*/public_html/wp-content/themes/
```
Annota il percorso completo della cartella del **child theme** sullo staging e in produzione, ad esempio
`www/staging13.www10.sitiscommesse24.com/public_html/wp-content/themes/NOME-CHILD`.

### C3. Secrets e variabili nel repository GitHub

Repo → **Settings** → **Secrets and variables** → **Actions**.

Secrets (tab Secrets → New repository secret):

| Nome | Valore |
|---|---|
| `SG_SSH_KEY` | la chiave privata del passo C1, completa di righe BEGIN/END |
| `SG_HOST` | hostname da SSH Credentials |
| `SG_USER` | username da SSH Credentials |

Variables (tab Variables → New repository variable):

| Nome | Valore |
|---|---|
| `SG_PORT` | `18765` |
| `STAGING_THEME_PATH` | percorso child theme staging (C2) |
| `PROD_THEME_PATH` | percorso child theme produzione (C2) |
| `STAGING_URL` | `https://staging13.www10.sitiscommesse24.com` |
| `PROD_URL` | `https://www10.sitiscommesse24.com` |

### C4. Protezione della produzione

Repo → **Settings** → **Environments** → **New environment** → nome `production` →
**Required reviewers** → aggiungi te stesso → Save. Da quel momento il workflow di produzione si ferma
e aspetta il tuo clic di approvazione su GitHub prima di toccare il sito live.

---

## D. Come fluiscono le modifiche

```
sessione Claude ──push──▶ branch staging ──Action──▶ staging SiteGround ──tu verifichi──▶
──▶ tu approvi su GitHub ──Action──▶ produzione SiteGround (solo cartella child theme)
```

1. Lavoro sul branch `staging`. Ogni push lancia `deploy-staging.yml`: rsync della sola cartella
   `theme/sitiscommesse24-child-v2/` nel percorso `STAGING_THEME_PATH`, poi svuota la cache
   SiteGround con WP-CLI. Entro un minuto apri lo staging e vedi il risultato.
2. Quando sei soddisfatto, merge di `staging` in `main`, oppure lancio manuale di
   `deploy-production.yml` (Actions → Deploy production → Run workflow). Il job si ferma sull'ambiente
   `production` finché non approvi. Prima del rsync fa un backup tar.gz del child theme attuale sul
   server, in `~/backups/`.
3. In alternativa al punto 2 puoi usare lo strumento di SiteGround: Site Tools → WordPress →
   **Staging** → ⋮ sulla copia → **Deploy** → **Custom Deploy**, selezionando solo la cartella del tema.
   Attenzione a **Full Deploy**: sovrascrive file **e database** di produzione con quelli dello staging,
   quindi perderesti articoli e modifiche fatte in produzione dopo la creazione dello staging.

Il rsync non usa `--delete`: un file presente sul server ma non nel repo non viene cancellato.
Quando il nuovo child sarà completo si attiva `--delete` per rimuovere i residui del vecchio CSS
(variabile `RSYNC_DELETE=true` nel workflow).

---

## E. Cosa posso fare io direttamente, cosa no

| Azione | Da questa sessione | Note |
|---|---|---|
| Leggere il sito e il wp-admin dello staging | Sì, dopo il punto B | audit automatici in sola lettura |
| Modificare file del tema e pubblicarli su staging | Sì, via push → Action | nessun accesso SSH dalla sandbox necessario |
| Pubblicare in produzione | Solo con la tua approvazione su GitHub | ambiente `production` protetto |
| Aprire SSH/SFTP verso SiteGround dalla sandbox | Non verificato | il proxy di rete potrebbe non tunnellare la porta 18765; non è necessario con il flusso sopra |
| Creare il repository GitHub | No | permesso non concedibile all'app |

---

## Fonti

- SiteGround, Enable SSH: https://world.siteground.com/tutorials/ssh/enable-ssh
- SiteGround, SSH access e porta 18765: https://eu.siteground.com/kb/access-site-ssh-connection/
- SiteGround, porte aperte sui server condivisi: https://eu.siteground.com/kb/which_ports_are_open_on_siteground_shared_servers/
- SiteGround, Git tool: https://eu.siteground.com/tutorials/getting-started/sg-git/
- SiteGround, Staging deploy: https://eu.siteground.com/tutorials/staging/deploy/
- SiteGround, FTP accounts: https://eu.siteground.com/kb/create-manage-and-edit-ftp-accounts/
- Claude Code, cloud environments (network access, allowed domains): https://code.claude.com/docs/en/cloud-environments
- Claude Code, quickstart cloud (GitHub App, repository privati): https://code.claude.com/docs/en/web-quickstart
