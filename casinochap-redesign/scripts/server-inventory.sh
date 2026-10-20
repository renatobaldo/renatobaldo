#!/usr/bin/env bash
# Eseguito SUL SERVER SiteGround via ssh (sola lettura). Stampa inventario e crea un tar dei temi in /tmp.
set -u
: "${STAGING_DOMAIN:?Serve STAGING_DOMAIN (es. staging1.casinochap.com)}"
echo "== HOME: $HOME"
echo "== Siti in ~/www:"; ls -1 ~/www 2>/dev/null || ls -1 "$HOME"
echo
for d in ~/www/*/public_html; do
  [ -d "$d" ] || continue
  echo "== $d"
  echo "   temi:    $(ls -1 "$d/wp-content/themes" 2>/dev/null | tr '\n' ' ')"
  echo "   plugin:  $(ls -1 "$d/wp-content/plugins" 2>/dev/null | wc -l) cartelle"
done
echo
STAGING=~/www/$STAGING_DOMAIN/public_html
echo "== STAGING: $STAGING"
[ -d "$STAGING" ] || { echo "cartella non trovata: controlla STAGING_DOMAIN"; exit 1; }
cd "$STAGING"
if command -v wp >/dev/null 2>&1; then
  echo "-- wp core version: $(wp core version 2>/dev/null)"
  echo "-- siteurl: $(wp option get siteurl 2>/dev/null)"
  echo "-- stylesheet dir: $(wp eval 'echo get_stylesheet_directory();' 2>/dev/null)"
  echo "-- template dir:   $(wp eval 'echo get_template_directory();' 2>/dev/null)"
  echo "-- temi:"; wp theme list --fields=name,status,version,update 2>/dev/null
  echo "-- plugin:"; wp plugin list --fields=name,status,version,update 2>/dev/null
  echo "-- post type:"; wp post-type list --fields=name,public,_builtin 2>/dev/null
  echo "-- conteggio contenuti:"; wp post list --post_type=any --post_status=any --format=count 2>/dev/null
  echo "-- php: $(php -v 2>/dev/null | head -1)"
  CHILD=$(wp eval 'echo basename(get_stylesheet_directory());' 2>/dev/null)
  PARENT=$(wp eval 'echo basename(get_template_directory());' 2>/dev/null)
  cd wp-content/themes && tar -czf /tmp/themes-staging.tgz --exclude='*.zip' "$PARENT" "$CHILD" 2>/dev/null && echo "-- tar creato: /tmp/themes-staging.tgz ($PARENT, $CHILD)"
else
  echo "wp-cli non disponibile: creo il tar di tutti i temi"
  cd wp-content/themes && tar -czf /tmp/themes-staging.tgz --exclude='*.zip' . && echo "-- tar creato"
fi
