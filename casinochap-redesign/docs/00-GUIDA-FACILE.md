# Guida facile: tutto quello che deve impostare Renato (circa 20 minuti)

Staging: `https://staging12.casinochap.com` · Produzione: `https://casinochap.com` · Hosting: SiteGround (account di casinochap).
Cinque passaggi, in ordine. Non incollare mai password o chiavi in chat: vanno solo nei campi indicati.

## 1. Repository GitHub (3 minuti)
1. Apri https://github.com/new
   - Repository name: `casinochap-redesign`
   - **Private**
   - Nessuna spunta (niente README, niente .gitignore, niente licenza)
   - **Create repository**
2. Apri https://github.com/settings/installations → **Claude** → **Configure** → in "Repository access" aggiungi
   `casinochap-redesign` → **Save**.
3. Scrivi in chat "repo fatto": il kit lo carico io nel repository.

## 2. Chiave SSH su SiteGround (7 minuti)
Serve una chiave nuova, perché l'account è diverso da quello di sitiscommesse24.
1. https://my.siteground.com → **Websites** → sito casinochap.com → **Site Tools**.
2. Menu a sinistra: **Devs** → **SSH Keys Manager**.
3. Scheda **Generate**: Key Name `github-actions-deploy`, scegli una **passphrase** e annotala → **Create**.
4. Nell'elenco "Manage SSH Keys", sulla riga della chiave clicca i tre puntini **⋮**:
   - **SSH Credentials**: copia **Hostname** e **Username**. La porta è `18765`.
   - **Private Key**: si apre un testo lungo da `-----BEGIN` a `-----END`. Cliccando **Copy** lo copi tutto, righe BEGIN/END comprese.
5. Se non trovi "SSH Keys Manager" o l'SSH risulta disattivato, scrivimelo: cambia il metodo di deploy.

## 3. Secrets e variabili su GitHub (5 minuti)
Apri https://github.com/renatobaldo/casinochap-redesign/settings/secrets/actions

**Scheda Secrets → New repository secret** (4 secret, nome esatto, MAIUSCOLO):

| Name | Secret |
|---|---|
| `SG_SSH_KEY` | la chiave privata completa del passo 2.4 |
| `SG_SSH_PASSPHRASE` | la passphrase scelta al passo 2.3 |
| `SG_HOST` | Hostname del passo 2.4 |
| `SG_USER` | Username del passo 2.4 |

**Scheda Variables → New repository variable** (4 variabili):

| Name | Value |
|---|---|
| `SG_PORT` | `18765` |
| `STAGING_DOMAIN` | `staging12.casinochap.com` |
| `STAGING_URL` | `https://staging12.casinochap.com` |
| `PROD_URL` | `https://casinochap.com` |

## 4. Protezione della produzione (2 minuti)
Repository → **Settings** → **Environments** → **New environment** → nome `production` → spunta
**Required reviewers** → aggiungi il tuo utente → **Save protection rules**.
Così nulla va in produzione senza il tuo clic. Se "Required reviewers" non compare, scrivimelo.

## 5. Ambiente Claude (3 minuti)
1. https://claude.ai/code → icona dell'ambiente (nuvola) vicino alla casella del prompt → **Add cloud environment**.
2. Nome: `casinochap`.
3. **Network access** → **Custom** → in **Allowed domains**, una riga per dominio:
   ```
   staging12.casinochap.com
   casinochap.com
   www.casinochap.com
   *.siteground.com
   ```
   Spunta **Also include default list of common package managers**.
4. **Environment variables**: `WP_BASE_URL=https://staging12.casinochap.com`
5. **Save**. Per lavorare su casinochap apri le sessioni con questo ambiente e con il repo `casinochap-redesign`.

## Poi tocca a me
Lancio da GitHub Actions il download del tema e dei plugin dallo staging, l'inventario del server e l'audit di
velocità, schermate e codice. Ti consegno il report con cosa tenere, cosa togliere e le priorità, prima di modificare
qualsiasi file. Nessuna modifica in produzione senza la tua richiesta e la tua approvazione su GitHub.

Per l'audit del pannello wp-admin servirà un utente WordPress dedicato: lo chiederò più avanti, se serve.
