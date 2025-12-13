package com.hdhomey.app.util

/**
 * Application-wide constants.
 *
 * Centralized location for magic strings, timeouts, and configuration values.
 */
object Constants {

    /**
     * API endpoints relative to server base URL.
     */
    object Api {
        const val HEALTH_CHECK = "/api/health"
        const val DEVICE_CODE = "/api/auth/device/code"
        const val DEVICE_POLL = "/api/auth/device/poll"
    }

    /**
     * Network timeouts in milliseconds.
     */
    object Timeouts {
        const val CONNECTION = 5_000L       // 5 seconds
        const val READ = 10_000L            // 10 seconds
        const val WRITE = 10_000L           // 10 seconds
        const val DEVICE_POLL = 30_000L     // 30 seconds (device code polling)
    }

    /**
     * Device code pairing configuration.
     */
    object DeviceCode {
        const val POLL_INTERVAL_MS = 3_000L  // 3 seconds between polls
        const val CODE_LENGTH = 6            // Expected code length (e.g., "ABCD12")
        const val EXPIRATION_SECONDS = 300   // 5 minutes
    }

    /**
     * UI configuration.
     */
    object UI {
        const val DEBOUNCE_MS = 300L         // Debounce for text input
        const val ANIMATION_DURATION_MS = 200L // Standard animation duration
    }

    /**
     * Logging tags.
     */
    object Tags {
        const val SERVER_REPOSITORY = "ServerRepository"
        const val SERVER_LIST = "ServerListFragment"
        const val ADD_SERVER = "AddServerFragment"
        const val AUTH = "AuthenticationFragment"
        const val MAIN = "MainActivity"
        const val API = "ApiClient"
    }

    /**
     * SharedPreferences keys (also defined in AppPreferences, but duplicated for reference).
     */
    object Prefs {
        const val SERVERS = "servers"
        const val ACTIVE_SERVER_ID = "active_server_id"
    }

    /**
     * User roles.
     */
    object Roles {
        const val ADMIN = "admin"
        const val VIEWER = "viewer"
    }

    /**
     * Error messages.
     */
    object Errors {
        const val NETWORK_ERROR = "Network error. Please check your connection."
        const val SERVER_UNREACHABLE = "Server is unreachable. Please check the URL."
        const val INVALID_URL = "Invalid URL format."
        const val DUPLICATE_NAME = "A server with this name already exists."
        const val AUTH_FAILED = "Authentication failed. Please try again."
        const val TOKEN_EXPIRED = "Your session has expired. Please sign in again."
    }
}
