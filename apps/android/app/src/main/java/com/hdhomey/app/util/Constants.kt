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
        const val SERVER_LIST = "ServerList"
        const val ADD_SERVER = "AddServer"
        const val AUTH = "Authentication"
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
     * User-facing error messages with actionable guidance.
     *
     * Guidelines:
     * - Explain WHAT went wrong in simple terms
     * - Suggest WHAT TO DO to fix it
     * - Keep under 2 sentences
     * - Avoid technical jargon (DNS, HTTP codes, etc.)
     */
    object Errors {
        // Network errors
        const val NETWORK_ERROR = "Cannot connect to the network. Check your WiFi or mobile data connection and try again."
        const val CONNECTION_TIMEOUT = "Connection timed out. The server might be slow or offline. Try again in a moment."
        const val NO_INTERNET = "No internet connection. Check your network settings and try again."

        // Server errors
        const val SERVER_UNREACHABLE = "Cannot reach server. Check the URL and your network connection, then try again."
        const val SERVER_ERROR = "Server returned an error. The server might be temporarily down. Try again later."
        const val SERVER_NOT_RESPONDING = "Server is not responding. Check if the server is running and try again."

        // URL validation errors
        const val INVALID_URL = "Invalid URL format. Use http:// or https:// and include the port (e.g., http://192.168.1.100:3000)."
        const val UNSUPPORTED_PROTOCOL = "Unsupported protocol. Use http:// or https:// only."
        const val EMPTY_URL = "Please enter a server URL (e.g., http://192.168.1.100:3000)."

        // Server management errors
        const val DUPLICATE_NAME = "A server with this name already exists. Choose a different name."
        const val DUPLICATE_URL = "This server URL is already in your list."
        const val SERVER_NOT_FOUND = "Server not found in your list."

        // Authentication errors
        const val AUTH_FAILED = "Authentication failed. Check your credentials and try again."
        const val AUTH_DENIED = "Authorization was denied. Try generating a new code or check with your server administrator."
        const val AUTH_EXPIRED = "Code expired. Click 'Try Again' to generate a new code."
        const val TOKEN_EXPIRED = "Your session has expired. Please sign in again."
        const val CODE_GENERATION_FAILED = "Could not generate device code. Check your connection and try again."
        const val POLLING_FAILED = "Lost connection while checking authorization. Your network might be unstable. Try again."

        // Generic fallback
        const val UNKNOWN_ERROR = "Something went wrong. Check your connection and try again."
        const val TRY_AGAIN = "Please try again in a moment. If the problem persists, check your network and server settings."
    }
}
