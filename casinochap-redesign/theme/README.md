# theme/

Qui vive il child theme di casinochap.com che il deploy copia sul server (cartella `theme/<nome-child>/`).

Parte vuoto: la copia reale del tema padre e del child attuali arriva dallo staging con il workflow
"Fetch theme from SiteGround" (Actions → Run workflow) e finisce in `legacy/themes/`. Da lì si crea il
nuovo child. Il nome della cartella va riportato nella variabile `SRC` di `scripts/deploy.sh`.
