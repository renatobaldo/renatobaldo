<?php
/**
 * Da integrare nel functions.php del child theme esistente (fase 2).
 * Carica un unico CSS compilato, versionato per cache busting, e rimuove il CSS del vecchio child.
 */
add_action( 'wp_enqueue_scripts', function () {
	$dir  = get_stylesheet_directory();
	$uri  = get_stylesheet_directory_uri();
	$file = '/assets/css/main.min.css'; // output del build; in sviluppo usare main.css

	// Fase 2: dequeue degli stili non più necessari, dopo averli identificati con l'audit.
	// wp_dequeue_style( 'handle-del-vecchio-child' );

	wp_enqueue_style(
		'ss24-child',
		$uri . $file,
		array(), // mettere qui l'handle del CSS del padre se deve essere caricato prima
		file_exists( $dir . $file ) ? filemtime( $dir . $file ) : null
	);
}, 20 );

/**
 * Critical CSS inline (fase 4): header + above the fold. Generato dal build, mai scritto a mano.
 */
add_action( 'wp_head', function () {
	$critical = get_stylesheet_directory() . '/assets/css/critical.css';
	if ( file_exists( $critical ) ) {
		echo '<style id="ss24-critical">' . file_get_contents( $critical ) . '</style>'; // phpcs:ignore
	}
}, 1 );
