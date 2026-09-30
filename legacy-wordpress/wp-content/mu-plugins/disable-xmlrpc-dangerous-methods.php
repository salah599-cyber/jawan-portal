<?php
/**
 * Plugin Name: Disable XML-RPC Dangerous Methods
 * Description: Removes pingback.ping and system.multicall from XML-RPC. Prefer blocking xmlrpc.php entirely at the web-server layer; use this only if XML-RPC must remain reachable. Keeps system.listMethods for diagnostics.
 * Version:     1.0.0
 * Author:      Jawan Investments
 *
 * Install: wp-content/mu-plugins/disable-xmlrpc-dangerous-methods.php
 * (must-use plugins load automatically; do not put this file in a subdirectory)
 *
 * Preferred control (definitive SSRF fix): deny xmlrpc.php at the web server.
 * Apache: <Files "xmlrpc.php"> Require all denied </Files>
 * nginx:  location = /xmlrpc.php { deny all; }
 *
 * If xmlrpc.php must remain reachable, also deploy
 * block-xmlrpc-pingback-ssrf.php so pingback.ping cannot fetch private IPs.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Drop methods that enable SSRF (pingback.ping) and parallel login brute-force
 * (system.multicall). system.listMethods is left registered.
 *
 * @param array $methods XML-RPC method map from WordPress core.
 * @return array
 */
function jwi_xmlrpc_disable_dangerous_methods( $methods ) {
	if ( ! is_array( $methods ) ) {
		return $methods;
	}

	unset(
		$methods['pingback.ping'],
		$methods['pingback.extensions.getPingbacks'],
		$methods['system.multicall']
	);

	return $methods;
}
add_filter( 'xmlrpc_methods', 'jwi_xmlrpc_disable_dangerous_methods', 99 );
