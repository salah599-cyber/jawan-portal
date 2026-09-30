<?php
/**
 * Plugin Name: Restrict Sensitive REST Routes
 * Description: Hides host, Jetpack, Yoast, and Newfold REST namespaces from anonymous clients and blocks unauthenticated factory-reset, MCP, and Yoast URL fetches. Must-use.
 * Version:     1.0.0
 * Author:      Jawan Investments
 *
 * Install: wp-content/mu-plugins/restrict-sensitive-rest.php
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @param string $route REST route.
 * @return bool
 */
function jwi_hsr_is_sensitive_namespace( $route ) {
	return (bool) preg_match(
		'#^/(?:bluehost|jetpack|yoast|creativemail|nfd-agents|newfold-features|monsterinsights)(?:/|$)#',
		$route
	);
}

/**
 * @param string $route REST route.
 * @return bool
 */
function jwi_hsr_is_admin_only( $route ) {
	if ( preg_match( '#/factory-reset(?:/|$)#', $route ) ) {
		return true;
	}
	if ( preg_match( '#(?:^|/)mcp(?:/|$)#', $route ) ) {
		return true;
	}
	if ( preg_match( '#^/yoast/v1/(?:file_size|get_head)(?:/|$)#', $route ) ) {
		return true;
	}
	if ( preg_match( '#/(?:verify_registration|remote_authorize|backup-helper-script)(?:/|$)#', $route ) ) {
		return true;
	}
	return (bool) preg_match(
		'#^/(?:bluehost|jetpack|creativemail|nfd-agents|newfold-features|monsterinsights)(?:/|$)#',
		$route
	);
}

/**
 * @return WP_Error
 */
function jwi_hsr_forbidden() {
	$status = is_user_logged_in() ? 403 : 401;
	return new WP_Error(
		'rest_forbidden',
		__( 'Sorry, you are not allowed to do that.' ),
		array( 'status' => $status )
	);
}

/**
 * @param mixed           $result  Dispatch result.
 * @param WP_REST_Server  $server  Server.
 * @param WP_REST_Request $request Request.
 * @return mixed|WP_Error
 */
function jwi_hsr_rest_pre_dispatch( $result, $server, $request ) {
	unset( $server );

	if ( null !== $result || ! ( $request instanceof WP_REST_Request ) ) {
		return $result;
	}

	$route  = $request->get_route();
	$method = strtoupper( $request->get_method() );

	if ( preg_match( '#/factory-reset(?:/|$)#', $route ) ) {
		return new WP_Error(
			'rest_forbidden',
			__( 'Factory reset is disabled.' ),
			array( 'status' => 403 )
		);
	}

	if ( jwi_hsr_is_admin_only( $route ) && ! current_user_can( 'manage_options' ) ) {
		return jwi_hsr_forbidden();
	}

	if ( jwi_hsr_is_sensitive_namespace( $route ) && ! is_user_logged_in() ) {
		return new WP_Error(
			'rest_not_logged_in',
			__( 'You are not currently logged in.' ),
			array( 'status' => 401 )
		);
	}

	$writes = array( 'POST', 'PUT', 'PATCH', 'DELETE' );
	if (
		jwi_hsr_is_sensitive_namespace( $route )
		&& in_array( $method, $writes, true )
		&& ! current_user_can( 'manage_options' )
	) {
		return jwi_hsr_forbidden();
	}

	return $result;
}
add_filter( 'rest_pre_dispatch', 'jwi_hsr_rest_pre_dispatch', 5, 3 );

/**
 * @param string $namespace REST namespace.
 * @return bool
 */
function jwi_hsr_namespace_is_hidden( $namespace ) {
	$hidden = array(
		'bluehost',
		'jetpack',
		'yoast',
		'creativemail',
		'nfd-agents',
		'newfold-features',
		'monsterinsights',
		'blu',
	);

	foreach ( $hidden as $prefix ) {
		if ( $namespace === $prefix || 0 === strpos( $namespace, $prefix . '/' ) ) {
			return true;
		}
	}

	return false;
}

/**
 * @param WP_REST_Response $response Index response.
 * @return WP_REST_Response
 */
function jwi_hsr_rest_index( $response ) {
	if ( current_user_can( 'manage_options' ) || ! ( $response instanceof WP_REST_Response ) ) {
		return $response;
	}

	$data = $response->get_data();
	if ( ! is_array( $data ) ) {
		return $response;
	}

	if ( ! empty( $data['namespaces'] ) && is_array( $data['namespaces'] ) ) {
		$data['namespaces'] = array_values(
			array_filter(
				$data['namespaces'],
				static function ( $namespace ) {
					return ! jwi_hsr_namespace_is_hidden( (string) $namespace );
				}
			)
		);
	}

	if ( ! empty( $data['routes'] ) && is_array( $data['routes'] ) ) {
		foreach ( array_keys( $data['routes'] ) as $route ) {
			if (
				jwi_hsr_is_sensitive_namespace( (string) $route )
				|| jwi_hsr_is_admin_only( (string) $route )
				|| jwi_hsr_namespace_is_hidden( trim( (string) $route, '/' ) )
			) {
				unset( $data['routes'][ $route ] );
			}
		}
	}

	$response->set_data( $data );
	return $response;
}
add_filter( 'rest_index', 'jwi_hsr_rest_index' );
