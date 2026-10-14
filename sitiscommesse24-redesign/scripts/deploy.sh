#!/usr/bin/env bash
# Deploy del child theme su SiteGround via rsync over SSH.
# Usato da GitHub Actions; eseguibile anche a mano:
#   SG_HOST=... SG_USER=... SG_PORT=18765 THEME_PATH=www/.../themes/child SSH_KEY=~/.ssh/sg_deploy ./scripts/deploy.sh
set -euo pipefail

: "${SG_HOST:?}" "${SG_USER:?}" "${SG_PORT:=18765}" "${THEME_PATH:?}" "${SSH_KEY:?}"
SRC="${SRC:-theme/sitiscommesse24-child-v2/}"
RSYNC_DELETE="${RSYNC_DELETE:-false}"
BACKUP="${BACKUP:-false}"

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
  --exclude 'preview/' --exclude '.DS_Store' --exclude 'functions-snippet.php' \
  -e "$SSH" "$SRC" "$REMOTE:$THEME_PATH/"

echo "Svuoto la cache SiteGround (WP-CLI)"
WP_ROOT=$(dirname "$(dirname "$(dirname "$THEME_PATH")")")
$SSH "$REMOTE" "cd '$WP_ROOT' && (wp sg purge 2>/dev/null || wp cache flush 2>/dev/null || true)"
echo "Deploy completato"
