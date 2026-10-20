#!/usr/bin/env bash
# Deploy del child theme su SiteGround via rsync over SSH.
# Usato da GitHub Actions; eseguibile anche a mano:
#   SG_HOST=... SG_USER=... SG_PORT=18765 THEME_PATH=www/.../themes/child SSH_KEY=~/.ssh/sg_deploy ./scripts/deploy.sh
set -euo pipefail

: "${SG_HOST:?}" "${SG_USER:?}" "${SG_PORT:=18765}" "${THEME_PATH:?}" "${SSH_KEY:?}"
# Cartella locale del child theme da pubblicare (da aggiornare quando il nuovo child esiste).
SRC="${SRC:-theme/casinochap-child/}"
RSYNC_DELETE="${RSYNC_DELETE:-false}"
BACKUP="${BACKUP:-false}"

[ -d "$SRC" ] || { echo "Cartella $SRC assente: niente da pubblicare"; exit 1; }

SSH="ssh -i $SSH_KEY -p $SG_PORT -o StrictHostKeyChecking=accept-new"
REMOTE="$SG_USER@$SG_HOST"

if [ "$BACKUP" = "true" ]; then
  STAMP=$(date +%Y%m%d-%H%M%S)
  echo "Backup del tema remoto in ~/backups/child-theme-$STAMP.tar.gz"
  $SSH "$REMOTE" "mkdir -p ~/backups && tar -czf ~/backups/child-theme-$STAMP.tar.gz -C \$(dirname '$THEME_PATH') \$(basename '$THEME_PATH') 2>/dev/null || echo 'cartella remota assente, nessun backup'"
fi

DEL=""
[ "$RSYNC_DELETE" = "true" ] && DEL="--delete"

echo "rsync $SRC -> $REMOTE:$THEME_PATH ($DEL)"
rsync -az $DEL \
  --exclude 'preview/' --exclude '.DS_Store' --exclude 'README.md' \
  -e "$SSH" "$SRC" "$REMOTE:$THEME_PATH/"

echo "Svuoto le cache (WP Rocket se presente, SiteGround, oggetti WP)"
WP_ROOT=$(dirname "$(dirname "$(dirname "$THEME_PATH")")")
# Le funzioni PHP sono chiamate solo se esistono: innocuo se WP Rocket non è installato.
$SSH "$REMOTE" "cd '$WP_ROOT' && wp eval 'foreach (array(\"rocket_clean_domain\",\"rocket_clean_minify\",\"rocket_clean_cache_busting\") as \$f) { if (function_exists(\$f)) { \$f(); echo \"\$f: ok\\n\"; } }' 2>/dev/null; rm -rf wp-content/cache/wp-rocket/* wp-content/cache/min/* wp-content/cache/busting/* 2>/dev/null; wp sg purge 2>/dev/null; wp cache flush 2>/dev/null; true"
echo "Deploy completato"
