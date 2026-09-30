<?php
/**
 * Plugin Name: Block XML-RPC Pingback SSRF
 * Description: Second layer if XML-RPC must stay reachable: reject pingbacks whose source/target host resolves to private or reserved addresses. The definitive control is still to disable XML-RPC / pingbacks entirely (deny xmlrpc.php at the web server; see disable-xmlrpc-dangerous-methods.php).
 * Version:     1.0.0
 * Author:      Jawan Investments
 *
 * Install: wp-content/mu-plugins/block-xmlrpc-pingback-ssrf.php
 * (must-use plugins load automatically; do not put this file in a subdirectory)
 *
 * Definitive fix: Apache <Files "xmlrpc.php"> Require all denied </Files>
 * or nginx: location = /xmlrpc.php { deny all; }
 * Deploy this plugin only when xmlrpc.php cannot be denied.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * CIDR ranges that must never be fetched by pingback.ping (RFC1918, loopback,
 * link-local, ULA, this-network, and CGNAT).
 *
 * @return string[]
 */
function jwi_ssrf_blocked_cidrs() {
	return array(
		'10.0.0.0/8',
		'172.16.0.0/12',
		'192.168.0.0/16',
		'127.0.0.0/8',
		'169.254.0.0/16',
		'0.0.0.0/8',
		'100.64.0.0/10',
		'::1/128',
		'::/128',
		'fc00::/7',
		'fe80::/10',
	);
}

/**
 * @param string $ip   Address from inet_ntop / DNS.
 * @param string $cidr CIDR notation.
 * @return bool
 */
function jwi_ssrf_ip_in_cidr( $ip, $cidr ) {
	$parts = explode( '/', $cidr, 2 );
	if ( 2 !== count( $parts ) ) {
		return false;
	}

	$subnet    = $parts[0];
	$mask_bits = (int) $parts[1];
	$ip_bin    = @inet_pton( $ip );
	$net_bin   = @inet_pton( $subnet );

	if ( false === $ip_bin || false === $net_bin || strlen( $ip_bin ) !== strlen( $net_bin ) ) {
		return false;
	}

	$len = strlen( $ip_bin ) * 8;
	if ( $mask_bits < 0 || $mask_bits > $len ) {
		return false;
	}

	$full_bytes     = (int) floor( $mask_bits / 8 );
	$remaining_bits = $mask_bits % 8;

	if ( $full_bytes > 0 && substr( $ip_bin, 0, $full_bytes ) !== substr( $net_bin, 0, $full_bytes ) ) {
		return false;
	}

	if ( $remaining_bits > 0 ) {
		$mask_byte = chr( ( 0xFF << ( 8 - $remaining_bits ) ) & 0xFF );
		return ( $ip_bin[ $full_bytes ] & $mask_byte ) === ( $net_bin[ $full_bytes ] & $mask_byte );
	}

	return true;
}

/**
 * Normalize IPv4-mapped IPv6 and dotted-decimal / integer IPv4 literals.
 *
 * @param string $ip Candidate address.
 * @return string|false Canonical IP, or false if not an IP literal.
 */
function jwi_ssrf_canonical_ip( $ip ) {
	$ip = trim( $ip );
	$ip = preg_replace( '/^\[|\]$/', '', $ip );

	if ( 0 === stripos( $ip, '::ffff:' ) ) {
		$mapped = substr( $ip, 7 );
		if ( false !== filter_var( $mapped, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 ) ) {
			$ip = $mapped;
		}
	}

	if ( false !== filter_var( $ip, FILTER_VALIDATE_IP ) ) {
		$packed = inet_pton( $ip );
		return false === $packed ? false : inet_ntop( $packed );
	}

	if ( ctype_digit( $ip ) ) {
		return long2ip( (int) $ip );
	}

	if ( preg_match( '/^\d{1,3}(?:\.\d{1,3}){0,3}$/', $ip ) ) {
		$long = ip2long( $ip );
		if ( false !== $long ) {
			return long2ip( $long );
		}
	}

	return false;
}

/**
 * @param string $ip Canonical IP.
 * @return bool
 */
function jwi_ssrf_ip_is_blocked( $ip ) {
	$canonical = jwi_ssrf_canonical_ip( $ip );
	if ( false === $canonical ) {
		return true;
	}

	foreach ( jwi_ssrf_blocked_cidrs() as $cidr ) {
		if ( jwi_ssrf_ip_in_cidr( $canonical, $cidr ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Hostnames that must never be used as pingback fetch targets.
 *
 * @param string $host Hostname (no port).
 * @return bool
 */
function jwi_ssrf_host_is_blocked_name( $host ) {
	$host = strtolower( rtrim( $host, '.' ) );

	if ( '' === $host ) {
		return true;
	}

	$blocked = array( 'localhost', 'localhost.localdomain', 'ip6-localhost', 'ip6-loopback' );
	if ( in_array( $host, $blocked, true ) ) {
		return true;
	}

	foreach ( array( '.localhost', '.local', '.internal', '.intranet', '.lan', '.home', '.corp' ) as $suffix ) {
		if ( substr( $host, -strlen( $suffix ) ) === $suffix ) {
			return true;
		}
	}

	return false;
}

/**
 * Resolve a hostname to A/AAAA records. Fail closed on empty results.
 *
 * @param string $host Hostname.
 * @return string[]
 */
function jwi_ssrf_resolve_host( $host ) {
	$ips = array();

	$records = @dns_get_record( $host, DNS_A | DNS_AAAA );
	if ( is_array( $records ) ) {
		foreach ( $records as $record ) {
			if ( ! empty( $record['ip'] ) ) {
				$ips[] = $record['ip'];
			}
			if ( ! empty( $record['ipv6'] ) ) {
				$ips[] = $record['ipv6'];
			}
		}
	}

	$v4 = @gethostbynamel( $host );
	if ( is_array( $v4 ) ) {
		$ips = array_merge( $ips, $v4 );
	}

	return array_values( array_unique( $ips ) );
}

/**
 * True when the URL must not be fetched (private/reserved destination).
 *
 * @param string $url Source or target URI from pingback.ping.
 * @return bool
 */
function jwi_ssrf_url_is_blocked( $url ) {
	if ( ! is_string( $url ) || '' === $url ) {
		return true;
	}

	$parsed = function_exists( 'wp_parse_url' ) ? wp_parse_url( $url ) : parse_url( $url );
	if ( ! is_array( $parsed ) || empty( $parsed['host'] ) ) {
		return true;
	}

	$scheme = isset( $parsed['scheme'] ) ? strtolower( $parsed['scheme'] ) : '';
	if ( 'http' !== $scheme && 'https' !== $scheme ) {
		return true;
	}

	$host = $parsed['host'];
	if ( jwi_ssrf_host_is_blocked_name( $host ) ) {
		return true;
	}

	$as_ip = jwi_ssrf_canonical_ip( $host );
	if ( false !== $as_ip ) {
		return jwi_ssrf_ip_is_blocked( $as_ip );
	}

	$resolved = jwi_ssrf_resolve_host( $host );
	if ( empty( $resolved ) ) {
		return true;
	}

	foreach ( $resolved as $ip ) {
		if ( jwi_ssrf_ip_is_blocked( $ip ) ) {
			return true;
		}
	}

	return false;
}

/**
 * XML-RPC fault 17 — processor must not continue (no outbound fetch).
 *
 * @param string $message Fault string.
 */
function jwi_ssrf_xmlrpc_fault( $message = 'The source IP address is not allowed.' ) {
	if ( ! headers_sent() ) {
		header( 'Content-Type: text/xml; charset=UTF-8' );
	}

	$code = 17;
	$text = htmlspecialchars( $message, ENT_XML1 | ENT_QUOTES, 'UTF-8' );

	echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
	echo '<methodResponse><fault><value><struct>';
	echo '<member><name>faultCode</name><value><int>' . (int) $code . '</int></value></member>';
	echo '<member><name>faultString</name><value><string>' . $text . '</string></value></member>';
	echo '</struct></value></fault></methodResponse>';
	exit;
}

/**
 * Collect URI strings from pingback XML-RPC params.
 *
 * @param mixed $args Decoded method params.
 * @return string[]
 */
function jwi_ssrf_urls_from_args( $args ) {
	$urls = array();

	if ( ! is_array( $args ) ) {
		return $urls;
	}

	array_walk_recursive(
		$args,
		static function ( $value ) use ( &$urls ) {
			if ( is_string( $value ) && preg_match( '#^https?://#i', $value ) ) {
				$urls[] = $value;
			}
		}
	);

	return $urls;
}

/**
 * @return mixed
 */
function jwi_ssrf_xmlrpc_params() {
	global $wp_xmlrpc_server;

	if ( isset( $wp_xmlrpc_server->message->params ) && is_array( $wp_xmlrpc_server->message->params ) ) {
		return $wp_xmlrpc_server->message->params;
	}

	return array();
}

/**
 * xmlrpc_call runs at the start of pingback.ping, before wp_safe_remote_get.
 * Core's pingback_ping only passes the method name, so params are read from
 * the IXR message.
 *
 * @param string $method Method name.
 * @param mixed  $args   Decoded params when provided (WP 5.7+ on some methods).
 */
function jwi_ssrf_xmlrpc_call( $method, $args = array() ) {
	$watch = array( 'pingback.ping', 'pingback.extensions.getPingbacks' );

	if ( 'system.multicall' === $method ) {
		$params = ( is_array( $args ) && ! empty( $args ) ) ? $args : jwi_ssrf_xmlrpc_params();
		$urls   = jwi_ssrf_urls_from_args( $params );
		foreach ( $urls as $url ) {
			if ( jwi_ssrf_url_is_blocked( $url ) ) {
				jwi_ssrf_xmlrpc_fault();
			}
		}
		return;
	}

	if ( ! in_array( $method, $watch, true ) ) {
		return;
	}

	$params = ( is_array( $args ) && ! empty( $args ) ) ? $args : jwi_ssrf_xmlrpc_params();
	$urls   = jwi_ssrf_urls_from_args( $params );

	if ( empty( $urls ) ) {
		jwi_ssrf_xmlrpc_fault();
	}

	foreach ( $urls as $url ) {
		if ( jwi_ssrf_url_is_blocked( $url ) ) {
			jwi_ssrf_xmlrpc_fault();
		}
	}
}
add_action( 'xmlrpc_call', 'jwi_ssrf_xmlrpc_call', 0, 2 );

/**
 * Strip private/reserved destinations from outgoing pings on publish.
 *
 * @param string[] $post_links         URLs found in the post, passed by reference.
 * @param string[] $pagelinks_to_ping  URLs still to ping, passed by reference.
 */
function jwi_ssrf_pre_ping( &$post_links, &$pagelinks_to_ping = null ) {
	if ( is_array( $post_links ) ) {
		$post_links = array_values(
			array_filter(
				$post_links,
				static function ( $url ) {
					return ! jwi_ssrf_url_is_blocked( $url );
				}
			)
		);
	}

	if ( is_array( $pagelinks_to_ping ) ) {
		$pagelinks_to_ping = array_values(
			array_filter(
				$pagelinks_to_ping,
				static function ( $url ) {
					return ! jwi_ssrf_url_is_blocked( $url );
				}
			)
		);
	}
}
add_action( 'pre_ping', 'jwi_ssrf_pre_ping', 0, 2 );
