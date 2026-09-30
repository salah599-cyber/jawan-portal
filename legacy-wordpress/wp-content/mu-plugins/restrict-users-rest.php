<?php
/**
 * Plugin Name: Restrict Users REST API
 * Description: Blocks unauthenticated user enumeration via the REST users routes, author archives, and oEmbed/REST author fields. Must-use; no third-party plugin required.
 * Version:     1.0.0
 * Author:      Jawan Investments
 *
 * Install: wp-content/mu-plugins/restrict-users-rest.php
 * (must-use plugins load automatically; do not put this file in a subdirectory)
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Route keys as registered by WP_REST_Users_Controller::register_routes().
 *
 * Core calls register_rest_route( 'wp/v2', '/users', ... ) and siblings.
 * We do not re-register those routes (that would duplicate handlers). Instead we
 * hook the rest_endpoints filter, which WP_REST_Server::get_routes() applies to
 * the fully built route map on every REST request — including pretty
 * /wp-json/wp/v2/users and ?rest_route=/wp/v2/users.
 */
function jwi_rur_user_route_keys() {
	return array(
		'/wp/v2/users',
		'/wp/v2/users/(?P<id>[\\d]+)',
		'/wp/v2/users/me',
	);
}

/**
 * Whether a rest_endpoints handler serves GET/HEAD.
 *
 * After registration, 'methods' is typically array( 'GET' => true ) but may still
 * be the WP_REST_Server::READABLE string ('GET') depending on filter timing.
 *
 * @param array $handler Route handler from rest_endpoints.
 * @return bool
 */
function jwi_rur_handler_is_readable( $handler ) {
	if ( empty( $handler['methods'] ) ) {
		return false;
	}

	$methods = $handler['methods'];

	if ( is_string( $methods ) ) {
		$parts = array_map( 'trim', explode( ',', strtoupper( $methods ) ) );
		return in_array( 'GET', $parts, true ) || in_array( 'HEAD', $parts, true );
	}

	if ( ! is_array( $methods ) ) {
		return false;
	}

	$normalized = array();
	foreach ( $methods as $key => $value ) {
		if ( is_string( $key ) && ! is_numeric( $key ) ) {
			if ( $value ) {
				$normalized[] = strtoupper( $key );
			}
		} elseif ( is_string( $value ) ) {
			$normalized[] = strtoupper( $value );
		}
	}

	return in_array( 'GET', $normalized, true ) || in_array( 'HEAD', $normalized, true );
}

/**
 * @return WP_Error
 */
function jwi_rur_not_logged_in() {
	return new WP_Error(
		'rest_not_logged_in',
		__( 'You are not currently logged in.' ),
		array( 'status' => 401 )
	);
}

/**
 * @return WP_Error
 */
function jwi_rur_cannot_list_users() {
	return new WP_Error(
		'rest_user_cannot_view',
		__( 'Sorry, you are not allowed to list users.' ),
		array( 'status' => rest_authorization_required_code() )
	);
}

/**
 * Permission callback replacing core GET handlers on the users routes.
 *
 * Why not unset() the routes?
 *   Unsetting /wp/v2/users breaks Gutenberg (author dropdown, current user) and
 *   Jetpack's wp-admin connection UI, which call these endpoints with a cookie.
 *
 * Why not rest_authentication_errors to lock the whole REST API?
 *   That 401s unauthenticated /wp/v2/posts, Jetpack public endpoints, oEmbed,
 *   and OptinMonster — all present on this site.
 *
 * Capability model:
 *   - Unauthenticated → 401 (fixes the finding; curl without cookies).
 *   - list_users (Administrator) → allow (wp-admin Users + Gutenberg).
 *   - GET /users/me → any logged-in user (Gutenberg + Jetpack; core's own
 *     permission_callback is __return_true and only checks login in the
 *     get_current_item callback — requiring list_users here would 403 Editors).
 *   - GET /users?who=authors → logged-in users who can edit_posts (Gutenberg
 *     author combobox). Still denied when logged out.
 *   - GET /users/{id} of the current user → allow (profile / "me" by id).
 *
 * POST/PUT/PATCH/DELETE handlers keep core permission_callbacks
 * (create_users / edit_user / delete_users).
 *
 * @param WP_REST_Request $request Request.
 * @return true|WP_Error
 */
function jwi_rur_users_read_permission( $request ) {
	if ( current_user_can( 'list_users' ) ) {
		return true;
	}

	$route = ( $request instanceof WP_REST_Request ) ? $request->get_route() : '';

	if ( preg_match( '#/users/me/?$#', $route ) ) {
		return is_user_logged_in() ? true : jwi_rur_not_logged_in();
	}

	if ( $request instanceof WP_REST_Request && 'authors' === $request->get_param( 'who' ) && is_user_logged_in() ) {
		$types = get_post_types( array( 'show_in_rest' => true ), 'objects' );
		foreach ( $types as $type ) {
			if ( post_type_supports( $type->name, 'author' ) && current_user_can( $type->cap->edit_posts ) ) {
				return true;
			}
		}
	}

	$request_id = ( $request instanceof WP_REST_Request ) ? (int) $request['id'] : 0;
	if ( $request_id && get_current_user_id() === $request_id ) {
		return true;
	}

	if ( ! is_user_logged_in() ) {
		return jwi_rur_not_logged_in();
	}

	return jwi_rur_cannot_list_users();
}

/**
 * Replace GET permission_callbacks on core user routes.
 *
 * rest_endpoints receives the map built by every register_rest_route() call
 * during rest_api_init. Numeric indexes are HTTP handlers; non-numeric keys
 * ('schema', 'allow_batch', 'args') must be left untouched.
 *
 * Priority 99 so this wins over plugins that re-open the users collection.
 *
 * @param array $endpoints Registered REST routes.
 * @return array
 */
function jwi_rur_filter_rest_endpoints( $endpoints ) {
	if ( ! is_array( $endpoints ) ) {
		return $endpoints;
	}

	foreach ( jwi_rur_user_route_keys() as $route ) {
		if ( empty( $endpoints[ $route ] ) || ! is_array( $endpoints[ $route ] ) ) {
			continue;
		}

		foreach ( $endpoints[ $route ] as $index => $handler ) {
			if ( ! is_numeric( $index ) || ! is_array( $handler ) ) {
				continue;
			}
			if ( ! jwi_rur_handler_is_readable( $handler ) ) {
				continue;
			}
			$endpoints[ $route ][ $index ]['permission_callback'] = 'jwi_rur_users_read_permission';
		}
	}

	return $endpoints;
}
add_filter( 'rest_endpoints', 'jwi_rur_filter_rest_endpoints', 99 );

/**
 * Defense in depth for batch REST and any plugin that bypasses rest_endpoints.
 *
 * @param mixed            $result  Dispatch result.
 * @param WP_REST_Server   $server  Server.
 * @param WP_REST_Request  $request Request.
 * @return mixed|WP_Error
 */
function jwi_rur_rest_pre_dispatch( $result, $server, $request ) {
	unset( $server );

	if ( null !== $result ) {
		return $result;
	}

	if ( ! $request instanceof WP_REST_Request ) {
		return $result;
	}

	$route   = $request->get_route();
	$method  = strtoupper( $request->get_method() );
	$is_read = ( 'GET' === $method || 'HEAD' === $method );

	if ( ! $is_read || ! preg_match( '#^/wp/v2/users(?:/|$)#', $route ) ) {
		return $result;
	}

	$allowed = jwi_rur_users_read_permission( $request );
	if ( true === $allowed ) {
		return $result;
	}

	return $allowed;
}
add_filter( 'rest_pre_dispatch', 'jwi_rur_rest_pre_dispatch', 10, 3 );

/**
 * Strip login-identifying fields if a user object is ever prepared without list_users.
 *
 * @param WP_REST_Response $response Response.
 * @param WP_User          $user     User.
 * @param WP_REST_Request  $request  Request.
 * @return WP_REST_Response
 */
function jwi_rur_strip_user_rest_fields( $response, $user, $request ) {
	unset( $user, $request );

	if ( current_user_can( 'list_users' ) ) {
		return $response;
	}

	if ( ! ( $response instanceof WP_REST_Response ) ) {
		return $response;
	}

	$data = $response->get_data();
	if ( ! is_array( $data ) ) {
		return $response;
	}

	unset( $data['slug'], $data['link'], $data['user_login'], $data['name'] );
	$response->set_data( $data );

	return $response;
}
add_filter( 'rest_prepare_user', 'jwi_rur_strip_user_rest_fields', 10, 3 );

/**
 * Strip author user IDs from public post REST payloads. Logged-in editors keep
 * the field so Gutenberg can display / save the post author.
 *
 * @param WP_REST_Response $response Response.
 * @return WP_REST_Response
 */
function jwi_rur_strip_author_from_rest( $response ) {
	if ( is_user_logged_in() ) {
		return $response;
	}

	if ( ! ( $response instanceof WP_REST_Response ) ) {
		return $response;
	}

	$data = $response->get_data();
	if ( ! is_array( $data ) ) {
		return $response;
	}

	unset( $data['author'] );
	$response->set_data( $data );

	return $response;
}
add_filter( 'rest_prepare_post', 'jwi_rur_strip_author_from_rest' );
add_filter( 'rest_prepare_page', 'jwi_rur_strip_author_from_rest' );
add_filter( 'rest_prepare_attachment', 'jwi_rur_strip_author_from_rest' );

/**
 * oEmbed JSON includes author_name / author_url (/author/login/).
 *
 * @param array $data oEmbed response.
 * @return array
 */
function jwi_rur_strip_oembed_author( $data ) {
	if ( is_array( $data ) ) {
		unset( $data['author_name'], $data['author_url'], $data['user_login'] );
	}
	return $data;
}
add_filter( 'oembed_response_data', 'jwi_rur_strip_oembed_author' );

/**
 * @param WP $wp WP request object.
 * @return bool
 */
function jwi_rur_is_public_front_request( $wp = null ) {
	if ( is_admin() || wp_doing_ajax() || wp_doing_cron() ) {
		return false;
	}
	if ( defined( 'REST_REQUEST' ) && REST_REQUEST ) {
		return false;
	}
	if ( defined( 'XMLRPC_REQUEST' ) && XMLRPC_REQUEST ) {
		return false;
	}
	if ( $wp instanceof WP && ! empty( $wp->query_vars['rest_route'] ) ) {
		return false;
	}
	if ( isset( $_GET['rest_route'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return false;
	}

	$request_uri = isset( $_SERVER['REQUEST_URI'] ) ? wp_unslash( $_SERVER['REQUEST_URI'] ) : '';
	if ( is_string( $request_uri ) && false !== strpos( $request_uri, '/wp-json/' ) ) {
		return false;
	}

	return true;
}

/**
 * Fail closed on ?author=N and /author/slug before redirect_canonical can
 * 301 to /author/{user_login}/ (the enumeration primitive).
 *
 * @param WP $wp Current request.
 */
function jwi_rur_parse_request_block_author( $wp ) {
	if ( ! jwi_rur_is_public_front_request( $wp ) ) {
		return;
	}

	$has_author = isset( $wp->query_vars['author'] ) || isset( $wp->query_vars['author_name'] );
	if ( ! $has_author && ( ! isset( $_GET['author'] ) || '' === $_GET['author'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return;
	}

	$wp->query_vars['error'] = '404';
	unset( $wp->query_vars['author'], $wp->query_vars['author_name'] );
}
add_action( 'parse_request', 'jwi_rur_parse_request_block_author', 1 );

/**
 * Force a real 404 for author archives (covers rewrite + ?author=N).
 */
function jwi_rur_template_redirect_block_author() {
	if ( ! jwi_rur_is_public_front_request() ) {
		return;
	}

	$author_query = isset( $_GET['author'] ) && '' !== $_GET['author']; // phpcs:ignore WordPress.Security.NonceVerification.Recommended

	if ( ! is_author() && ! $author_query ) {
		return;
	}

	global $wp_query;
	if ( $wp_query instanceof WP_Query ) {
		$wp_query->set_404();
		$wp_query->is_author  = false;
		$wp_query->is_archive = false;
		$wp_query->is_home    = false;
	}

	status_header( 404 );
	nocache_headers();

	$template = get_query_template( '404' );
	if ( $template ) {
		include $template;
	}
	exit;
}
add_action( 'template_redirect', 'jwi_rur_template_redirect_block_author', 0 );

/**
 * Stop canonical redirect from leaking /author/{login} when ?author=N is used.
 *
 * @param string|false $redirect_url Canonical URL.
 * @return string|false
 */
function jwi_rur_disable_author_canonical( $redirect_url ) {
	if ( is_author() || ( isset( $_GET['author'] ) && '' !== $_GET['author'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		return false;
	}
	return $redirect_url;
}
add_filter( 'redirect_canonical', 'jwi_rur_disable_author_canonical' );

/**
 * Hide the users sitemap provider (same username leak as author archives).
 *
 * @param WP_Sitemaps_Provider|false $provider Provider.
 * @param string                     $name     Provider name.
 * @return WP_Sitemaps_Provider|false
 */
function jwi_rur_disable_users_sitemap( $provider, $name ) {
	if ( 'users' === $name ) {
		return false;
	}
	return $provider;
}
add_filter( 'wp_sitemaps_add_provider', 'jwi_rur_disable_users_sitemap', 10, 2 );
