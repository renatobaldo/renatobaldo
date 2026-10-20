#!/usr/bin/env bash
# Verifica (sola lettura) dallo stesso server: HTTP delle pagine chiave, challenge anti-bot, errori PHP recenti.
set -u
: "${STAGING_DOMAIN:?Serve STAGING_DOMAIN}"
cd ~/www/$STAGING_DOMAIN/public_html || exit 1
echo "== Tema attivo: $(wp eval 'echo get_stylesheet(), " (padre: ", get_template(), ")";' 2>/dev/null)"
echo
# Aggiungere qui i percorsi da controllare dopo l'inventario (recensione, bonus, articolo).
for path in /; do
  tmp=$(mktemp)
  code=$(curl -sS -o "$tmp" -w "%{http_code}" -A "Mozilla/5.0 (server-check)" "https://$STAGING_DOMAIN$path" 2>&1 || echo "ERR")
  chal=$(grep -c "Robot Challenge" "$tmp"); fatal=$(grep -ci "fatal error\|parse error" "$tmp")
  echo "== $path → HTTP $code · challenge: $chal · errori PHP nel body: $fatal · bytes: $(wc -c < "$tmp")"
  rm -f "$tmp"
done
echo
echo "== Ultime righe del log errori PHP (se esiste):"
for f in ~/www/$STAGING_DOMAIN/public_html/error_log ~/www/$STAGING_DOMAIN/public_html/wp-content/debug.log; do
  [ -f "$f" ] && { echo "-- $f"; tail -n 8 "$f" | cut -c1-200; }
done
echo "fine"
