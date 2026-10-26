# Guida passo-passo: inserire secrets e variabili su GitHub

Un **secret** è un valore riservato (password, chiave) che GitHub conserva cifrato: nessuno può rileggerlo,
ma le Actions possono usarlo. Una **variabile** è un valore non segreto (porta, URL) che resta leggibile.
Si inseriscono una volta sola.

## Parte 1 – Dove si inseriscono

1. Apri https://github.com/renatobaldo/casinochap-redesign e accedi se serve.
2. Barra del repository → **Settings** (ingranaggio, ultima voce; se non la vedi clicca "···").
3. Menu di sinistra, gruppo **Security** → **Secrets and variables** → **Actions**.
4. Due schede in alto: **Secrets** e **Variables**.

Link diretto: https://github.com/renatobaldo/casinochap-redesign/settings/secrets/actions

## Parte 2 – Inserire un secret

1. Scheda **Secrets** → **New repository secret**.
2. **Name**: esattamente come in tabella, MAIUSCOLO, senza spazi.
3. **Secret**: incolla il valore, senza spazi o righe vuote prima o dopo.
4. **Add secret**. Per correggere: matita accanto al nome → incolla → **Update secret**.

## Parte 3 – Secrets per l'audit wp-admin

| Name | Secret |
|---|---|
| `WP_USER` | utente wp-admin dedicato dello staging |
| `WP_PASS` | la sua password applicazione |

## Parte 4 – Secrets per il deploy su SiteGround

### 4a. Chiave privata

Se casinochap sta nello stesso account SiteGround di sitiscommesse24 (da verificare: Renato ha indicato un altro hosting), i quattro valori sono gli stessi
già usati in quel repository: ricopiali (la chiave privata va ripresa da Site Tools, GitHub non la mostra).

Altrimenti: https://my.siteground.com → **Websites** → sito casinochap → **Site Tools** → **Devs** →
**SSH Keys Manager** → **Generate** (nome `github-actions-deploy`, passphrase annotata) → nell'elenco,
⋮ → **Private Key** → **Copy**. Serve tutto, dalla riga BEGIN alla riga END.

### 4b. Inserire i secrets

| Name | Secret |
|---|---|
| `SG_SSH_KEY` | il testo copiato al passo 4a |
| `SG_SSH_PASSPHRASE` | la passphrase della chiave |
| `SG_HOST` | hostname da ⋮ → **SSH Credentials** (tipo `ssh.<dominio>`) |
| `SG_USER` | username da SSH Credentials (tipo `u1234-xxxx`) |

## Parte 5 – Le variabili

Scheda **Variables** → **New repository variable**, una alla volta:

| Name | Value |
|---|---|
| `SG_PORT` | `18765` |
| `STAGING_DOMAIN` | `staging2.casinochap.com` |
| `STAGING_URL` | `https://staging2.casinochap.com` |
| `PROD_URL` | URL canonico di casinochap.com |
| `AUDIT_INSECURE_TLS` | `1`, solo finché il certificato dello staging è scaduto (vedi docs/01) |

`STAGING_THEME_PATH`, `PROD_THEME_PATH` e `THEME_SRC` si aggiungono dopo: i valori te li do io dal
workflow `fetch-theme.yml`.

## Parte 6 – Verifica finale

Scheda Secrets: 6 righe (`SG_HOST`, `SG_SSH_KEY`, `SG_SSH_PASSPHRASE`, `SG_USER`, `WP_PASS`, `WP_USER`).
Scheda Variables: 5 righe (`AUDIT_INSECURE_TLS`, `PROD_URL`, `SG_PORT`, `STAGING_DOMAIN`, `STAGING_URL`).
Poi scrivi in chat "secrets fatti": lancio io `fetch-theme.yml` e l'audit e, se qualcosa non torna, lo vedo
dai log e ti dico cosa correggere.

## Errori comuni

- **Nome con minuscole o spazi**: il workflow non lo trova.
- **Chiave incompleta**: manca la riga END o c'è uno spazio iniziale → "invalid format". Reinserisci.
- **Passphrase diversa**: "incorrect passphrase". Se non la ricordi, genera una nuova chiave e aggiorna
  `SG_SSH_KEY` e `SG_SSH_PASSPHRASE`.
- **Password nelle Variables**: cancellala da lì e rimettila in Secrets.
