package com.hdhomey.app.data.model

import kotlinx.serialization.Serializable
import java.util.UUID

/**
 * Represents a configured HD Homey server instance.
 *
 * Supports multiple servers with individual authentication tokens,
 * enabling users to connect to different homes, accounts, or testing environments.
 *
 * @property id Unique identifier for this server (UUID)
 * @property name User-defined display name (e.g., "Home", "Office", "Vacation House")
 * @property url Server URL including protocol (http:// or https://)
 * @property jwt Per-server JWT authentication token (null if not authenticated)
 * @property expiresAt JWT expiration timestamp in milliseconds (null if not authenticated)
 * @property userRole User's role on this server ("admin" or "viewer", null if not authenticated)
 * @property username Username for this server (null if not authenticated)
 * @property lastConnected Timestamp of last successful connection in milliseconds
 * @property createdAt Timestamp when server was added in milliseconds
 */
@Serializable
data class Server(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val url: String,
    val jwt: String? = null,
    val expiresAt: Long? = null,
    val userRole: String? = null,
    val username: String? = null,
    val lastConnected: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis()
) {
    /**
     * Checks if the JWT token is expired.
     *
     * @return true if token is expired or expiration is unknown, false if still valid
     */
    fun isTokenExpired(): Boolean {
        return expiresAt?.let { it < System.currentTimeMillis() } ?: true
    }

    /**
     * Checks if the user is authenticated on this server.
     *
     * @return true if JWT token exists and is not expired
     */
    fun isAuthenticated(): Boolean {
        return jwt != null && !isTokenExpired()
    }

    /**
     * Checks if the user has admin role on this server.
     *
     * @return true if user is authenticated and has admin role
     */
    fun isAdmin(): Boolean {
        return isAuthenticated() && userRole == ROLE_ADMIN
    }

    /**
     * Creates a copy of this server with updated authentication information.
     *
     * @param jwt New JWT token
     * @param expiresAt New expiration timestamp
     * @param username Username
     * @param userRole User role ("admin" or "viewer")
     * @return New Server instance with updated authentication
     */
    fun withAuthentication(
        jwt: String,
        expiresAt: Long,
        username: String,
        userRole: String
    ): Server {
        return copy(
            jwt = jwt,
            expiresAt = expiresAt,
            username = username,
            userRole = userRole,
            lastConnected = System.currentTimeMillis()
        )
    }

    /**
     * Creates a copy of this server with cleared authentication.
     *
     * @return New Server instance without authentication
     */
    fun withoutAuthentication(): Server {
        return copy(
            jwt = null,
            expiresAt = null,
            username = null,
            userRole = null
        )
    }

    /**
     * Formats the last connected time as a human-readable string.
     *
     * @return Relative time string (e.g., "5 minutes ago", "2 days ago")
     */
    fun getLastConnectedDisplay(): String {
        val now = System.currentTimeMillis()
        val diff = now - lastConnected
        val seconds = diff / 1000
        val minutes = seconds / 60
        val hours = minutes / 60
        val days = hours / 24

        return when {
            days > 0 -> "$days day${if (days > 1) "s" else ""} ago"
            hours > 0 -> "$hours hour${if (hours > 1) "s" else ""} ago"
            minutes > 0 -> "$minutes minute${if (minutes > 1) "s" else ""} ago"
            else -> "Just now"
        }
    }

    companion object {
        const val ROLE_ADMIN = "admin"
        const val ROLE_VIEWER = "viewer"
    }
}
