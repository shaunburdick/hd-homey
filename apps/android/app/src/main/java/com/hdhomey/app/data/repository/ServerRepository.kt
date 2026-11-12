package com.hdhomey.app.data.repository

import com.hdhomey.app.data.model.Server
import com.hdhomey.app.storage.AppPreferences
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for managing HD Homey server configurations.
 *
 * Provides CRUD operations for servers with thread-safe access to AppPreferences.
 * All operations are synchronous since SharedPreferences is already fast.
 *
 * For production apps with many servers or complex queries, consider migrating to Room.
 */
@Singleton
class ServerRepository @Inject constructor(
    private val prefs: AppPreferences
) {

    /**
     * Adds a new server to the configuration.
     *
     * @param name User-defined display name (e.g., "Home", "Office")
     * @param url Server URL with protocol (http:// or https://)
     * @return The newly created Server object with generated ID
     * @throws IllegalArgumentException if server with same name already exists
     */
    fun addServer(name: String, url: String): Server {
        val servers = prefs.loadServers()
        
        // Check for duplicate name
        if (servers.any { it.name.equals(name, ignoreCase = true) }) {
            throw IllegalArgumentException("A server with the name '$name' already exists")
        }

        val newServer = Server(
            name = name.trim(),
            url = url.trim()
        )

        val updatedServers = servers + newServer
        prefs.saveServers(updatedServers)

        return newServer
    }

    /**
     * Removes a server from the configuration.
     *
     * If the removed server is currently active, clears the active server selection.
     *
     * @param id Server ID to remove
     * @return true if server was found and removed, false if not found
     */
    fun removeServer(id: String): Boolean {
        val servers = prefs.loadServers()
        val updatedServers = servers.filterNot { it.id == id }

        if (updatedServers.size == servers.size) {
            return false // Server not found
        }

        prefs.saveServers(updatedServers)

        // Clear active server if it was the one removed
        if (prefs.getActiveServerId() == id) {
            prefs.clearActiveServer()
        }

        return true
    }

    /**
     * Gets all configured servers.
     *
     * @return List of all servers, sorted by last connected (most recent first)
     */
    fun getAllServers(): List<Server> {
        return prefs.loadServers().sortedByDescending { it.lastConnected }
    }

    /**
     * Gets a specific server by ID.
     *
     * @param id Server ID
     * @return Server object if found, null otherwise
     */
    fun getServerById(id: String): Server? {
        return prefs.loadServers().find { it.id == id }
    }

    /**
     * Updates an existing server.
     *
     * @param server Updated server object
     * @return true if server was found and updated, false if not found
     */
    fun updateServer(server: Server): Boolean {
        val servers = prefs.loadServers()
        val index = servers.indexOfFirst { it.id == server.id }

        if (index == -1) {
            return false // Server not found
        }

        val updatedServers = servers.toMutableList()
        updatedServers[index] = server

        return prefs.saveServers(updatedServers)
    }

    /**
     * Sets a server as the currently active one.
     *
     * Updates the server's lastConnected timestamp.
     *
     * @param id Server ID to set as active
     * @return true if server was found and set as active, false if not found
     */
    fun setActiveServer(id: String): Boolean {
        val server = getServerById(id) ?: return false

        // Update lastConnected timestamp
        val updatedServer = server.copy(lastConnected = System.currentTimeMillis())
        updateServer(updatedServer)

        return prefs.setActiveServerId(id)
    }

    /**
     * Gets the currently active server.
     *
     * @return Active Server object if one is set and exists, null otherwise
     */
    fun getActiveServer(): Server? {
        val activeId = prefs.getActiveServerId() ?: return null
        return getServerById(activeId)
    }

    /**
     * Clears the active server selection.
     *
     * Does not remove the server configuration.
     *
     * @return true if clear was successful
     */
    fun clearActiveServer(): Boolean {
        return prefs.clearActiveServer()
    }

    /**
     * Updates a server's authentication information.
     *
     * Convenience method for updating JWT, expiration, username, and role.
     *
     * @param serverId Server ID to update
     * @param jwt JWT authentication token
     * @param expiresAt Token expiration timestamp in milliseconds
     * @param username Username
     * @param userRole User role ("admin" or "viewer")
     * @return true if server was found and updated, false if not found
     */
    fun updateServerAuthentication(
        serverId: String,
        jwt: String,
        expiresAt: Long,
        username: String,
        userRole: String
    ): Boolean {
        val server = getServerById(serverId) ?: return false
        val updatedServer = server.withAuthentication(jwt, expiresAt, username, userRole)
        return updateServer(updatedServer)
    }

    /**
     * Clears authentication for a specific server.
     *
     * Removes JWT token, username, role, and expiration while keeping server configuration.
     *
     * @param serverId Server ID
     * @return true if server was found and updated, false if not found
     */
    fun clearServerAuthentication(serverId: String): Boolean {
        val server = getServerById(serverId) ?: return false
        val updatedServer = server.withoutAuthentication()
        return updateServer(updatedServer)
    }

    /**
     * Checks if any servers are configured.
     *
     * @return true if at least one server exists
     */
    fun hasServers(): Boolean {
        return prefs.loadServers().isNotEmpty()
    }

    /**
     * Gets the count of configured servers.
     *
     * @return Number of servers
     */
    fun getServerCount(): Int {
        return prefs.loadServers().size
    }

    /**
     * Checks if a server name already exists.
     *
     * Case-insensitive comparison.
     *
     * @param name Server name to check
     * @param excludeId Optional server ID to exclude from check (for updates)
     * @return true if name exists
     */
    fun isServerNameExists(name: String, excludeId: String? = null): Boolean {
        return prefs.loadServers().any {
            it.name.equals(name, ignoreCase = true) && it.id != excludeId
        }
    }
}
