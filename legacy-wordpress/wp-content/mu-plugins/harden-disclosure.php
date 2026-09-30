<?php
/**
 * Plugin Name: Harden Disclosure
 * Description: Disables XML-RPC and pingbacks, and removes the WordPress version generator. Must-use.
 * Version:     1.0.0
 * Author:      Jawan Investments
 *
 * Install: wp-content/mu-plugins/harden-disclosure.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_filter( 'xmlrpc_enabled', '__return_false', PHP_INT_MAX );
add_filter( 'pings_open', '__return_false', PHP_INT_MAX );
add_filter( 'pre_option_enable_xmlrpc', '__return_zero' );
add_filter( 'the_generator', '__return_empty_string' );
add_filter( 'jetpack_json_api_enabled', '__return_false', PHP_INT_MAX );

remove_action( 'wp_head', 'wp_generator' );
remove_action( 'wp_head', 'rsd_link' );
remove_action( 'wp_head', 'wlwmanifest_link' );

/**
 * @param array $headers Response headers.
 * @return array
 */
function jwi_hd_strip_pingback( $headers ) {
	if ( is_array( $headers ) ) {
		unset( $headers['X-Pingback'] );
	}
	return $headers;
}
add_filter( 'wp_headers', 'jwi_hd_strip_pingback' );
